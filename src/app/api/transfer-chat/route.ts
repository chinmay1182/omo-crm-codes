// Chat transfer API
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSession } from '@/app/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, fromAgentId, toAgentId } = await req.json();

    if (!chatId || !fromAgentId || !toAgentId) {
      return NextResponse.json({
        error: 'Chat ID, from agent ID, and to agent ID are required'
      }, { status: 400 });
    }

    // Check if the agents exist and are active
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, username, status')
      .in('id', [fromAgentId, toAgentId])
      .eq('status', 'active');

    if (agentsError || !agents || agents.length !== 2) {
      return NextResponse.json({
        error: 'One or both agents not found or inactive'
      }, { status: 400 });
    }

    // Mark current assignment as transferred
    await supabase
      .from('chat_assignments')
      .update({ status: 'transferred' })
      .eq('chat_id', chatId)
      .eq('agent_id', fromAgentId)
      .eq('status', 'active');

    // Create new assignment
    const { error: insertError } = await supabase
      .from('chat_assignments')
      .insert([{
        chat_id: chatId,
        agent_id: toAgentId,
        assigned_by: fromAgentId,
        status: 'active'
      }]);

    if (insertError) throw insertError;

    // Log the transfer
    await supabase
      .from('chat_transfer_logs')
      .insert([{
        chat_id: chatId,
        from_agent_id: fromAgentId,
        to_agent_id: toAgentId,
        transferred_by: fromAgentId
      }]);

    const fromAgent = agents.find(a => a.id === fromAgentId);
    const toAgent = agents.find(a => a.id === toAgentId);

    return NextResponse.json({
      success: true,
      message: `Chat transferred from ${fromAgent?.username} to ${toAgent?.username}`,
      transfer: {
        chatId,
        fromAgent: fromAgent?.username,
        toAgent: toAgent?.username,
        transferredAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error transferring chat:', error);
    return NextResponse.json({
      error: 'Failed to transfer chat'
    }, { status: 500 });
  }
}