import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// Normalize phone number function - same as frontend
const normalizePlus = (num: string) => {
  const cleaned = (num || "").replace(/\D/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("91") ? `+${cleaned}` : `+91${cleaned}`;
};

// POST - Assign chat to agent
export async function POST(request: NextRequest) {
  try {
    const { chatId, agentId } = await request.json();

    if (!chatId || !agentId) {
      return NextResponse.json(
        { error: "Chat ID and Agent ID are required" },
        { status: 400 }
      );
    }

    // Normalize the chat ID
    const normalizedChatId = normalizePlus(chatId);

    // Upsert assignment
    const { error: upsertError } = await supabase
      .from('chat_assignments')
      .upsert(
        {
          chat_id: normalizedChatId,
          agent_id: agentId,
          assigned_at: new Date().toISOString()
        },
        { onConflict: 'chat_id' }
      );

    if (upsertError) throw upsertError;

    // Get agent details for response
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('username, full_name')
      .eq('id', agentId)
      .single();

    if (agentError) console.error('Error fetching agent details:', agentError);

    return NextResponse.json(
      {
        success: true,
        message: "Chat assigned successfully",
        agent: agent || { id: agentId },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error assigning chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Fetch assignment for a chat
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Normalize the chat ID
    const normalizedChatId = normalizePlus(chatId);

    const { data: assignment, error } = await supabase
      .from('chat_assignments')
      .select(`
        agent_id,
        agents (
            username,
            full_name
        )
      `)
      .eq('chat_id', normalizedChatId)
      .maybeSingle();

    if (error) throw error;

    // Format response to flatten structure if needed or keep consistent
    const formattedAssignment = assignment ? {
      agent_id: assignment.agent_id,
      username: assignment.agents?.username,
      full_name: assignment.agents?.full_name
    } : null;

    return NextResponse.json({
      assignment: formattedAssignment,
    });
  } catch (error) {
    console.error("Error fetching chat assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Normalize the chat ID
    const normalizedChatId = normalizePlus(chatId);

    const { error } = await supabase
      .from('chat_assignments')
      .delete()
      .eq('chat_id', normalizedChatId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Assignment removed successfully",
    });
  } catch (error) {
    console.error("Error removing chat assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}