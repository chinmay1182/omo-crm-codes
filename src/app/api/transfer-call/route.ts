// Call transfer API
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSession } from '@/app/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, fromAgentId, toAgentId } = await req.json();

    if (!callId || !fromAgentId || !toAgentId) {
      return NextResponse.json({
        error: 'Call ID, from agent ID, and to agent ID are required'
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
    const { error: updateError } = await supabase
      .from('call_assignments')
      .update({ status: 'transferred' })
      .eq('call_id', callId)
      .eq('agent_id', fromAgentId)
      .eq('status', 'active');

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      // Continue anyway as we want to log the transfer and assign new agent
    }

    // Create new assignment
    const { error: insertError } = await supabase
      .from('call_assignments')
      .insert({
        call_id: callId,
        agent_id: toAgentId,
        assigned_by: session.user.id,
        status: 'active'
      });

    if (insertError) throw insertError;

    // Log the transfer
    const { error: logError } = await supabase
      .from('call_transfer_logs')
      .insert({
        call_id: callId,
        from_agent_id: fromAgentId,
        to_agent_id: toAgentId,
        transferred_by: session.user.id
      });

    if (logError) console.error("Error logging transfer", logError);

    const fromAgent = agents.find(a => a.id == fromAgentId);
    const toAgent = agents.find(a => a.id == toAgentId);

    return NextResponse.json({
      success: true,
      message: `Call transferred from ${fromAgent?.username} to ${toAgent?.username}`,
      transfer: {
        callId,
        fromAgent: fromAgent?.username,
        toAgent: toAgent?.username,
        transferredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error transferring call:', error);
    return NextResponse.json({
      error: 'Failed to transfer call'
    }, { status: 500 });
  }
}