import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

// Helper function to create notifications
async function createNotification(title: string, message: string, type: string, relatedId?: string, relatedType?: string) {
  try {
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      related_id: relatedId ? String(relatedId) : null,
      related_type: relatedType || null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let agentPermissions;
    let agentId;

    try {
      let sessionStr = agentSession.value;
      if (sessionStr.includes('%')) {
        sessionStr = decodeURIComponent(sessionStr);
      }
      const sessionData = JSON.parse(sessionStr);
      const agent = sessionData.user || sessionData;
      agentPermissions = agent.permissions;
      agentId = agent.id;

      if (!agentPermissions?.leads?.includes('enable_disable')) {
        return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Supabase join syntax: table(column) or table!fk(column)
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        contacts (
          first_name,
          last_name
        ),
        companies (
          name
        ),
        agents (
          id,
          full_name,
          username
        )
      `)
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Permission Check: View All vs View Assigned
    const canViewAll = agentPermissions.leads.includes('view_all');
    const canViewAssigned = agentPermissions.leads.includes('view_assigned');

    if (!canViewAll) {
      if (!canViewAssigned) {
        return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
      }
      // Strictly check assignment
      if (lead.assigned_to !== agentId) {
        return NextResponse.json({ error: 'Access Denied: You can only view assigned leads' }, { status: 403 });
      }
    }

    // Format response to match original structure
    const formattedLead = {
      ...lead,
      contact_name: lead.contacts ? `${lead.contacts.first_name || ''} ${lead.contacts.last_name || ''}`.trim() : null,
      company_name: lead.companies?.name || null,
      assigned_agent_name: lead.agents?.full_name || null,
      assigned_agent_username: lead.agents?.username || null
    };

    return NextResponse.json(formattedLead);
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    try {
      let sessionStr = agentSession.value;
      if (sessionStr.includes('%')) {
        sessionStr = decodeURIComponent(sessionStr);
      }
      const sessionData = JSON.parse(sessionStr);
      const agent = sessionData.user || sessionData;
      const permissions = agent.permissions;

      if (!permissions?.leads?.includes('enable_disable')) {
        return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
      }

      // Granular Permission Checks
      const isAssignmentChange = updates.assigned_to !== undefined;
      const otherKeys = Object.keys(updates).filter(k => k !== 'assigned_to');
      const isOtherEdit = otherKeys.length > 0;

      if (isAssignmentChange) {
        if (!permissions?.leads?.includes('transfer_lead')) {
          return NextResponse.json({ error: 'Access Denied: You do not have permission to transfer leads' }, { status: 403 });
        }
      }

      if (isOtherEdit) {
        if (!permissions?.leads?.includes('edit')) {
          return NextResponse.json({ error: 'Access Denied: No edit permission' }, { status: 403 });
        }
      }

    } catch (e) {
      return NextResponse.json({ error: 'Invalid session/permissions' }, { status: 401 });
    }

    // Get current lead data for comparison
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !currentLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Filter valid fields (remove id if present)
    const validUpdates: any = { ...updates, updated_at: new Date().toISOString() };
    delete validUpdates.id;

    if (Object.keys(validUpdates).length <= 1) { // Only updated_at
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('leads')
      .update(validUpdates)
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Create notifications for specific field updates
    if (updates.assigned_to !== undefined) {
      if (updates.assigned_to && updates.assigned_to !== currentLead.assigned_to) {
        // Lead assigned to new agent
        try {
          const { data: agent } = await supabase
            .from('agents')
            .select('full_name, username')
            .eq('id', updates.assigned_to)
            .single();

          if (agent) {
            await createNotification(
              'Lead Assigned',
              `Lead "${currentLead.assignment_name}" has been assigned to ${agent.full_name || agent.username}`,
              'lead_assigned',
              leadId,
              'lead'
            );
          }
        } catch (error) {
          console.error('Error creating assignment notification:', error);
        }
      } else if (!updates.assigned_to && currentLead.assigned_to) {
        // Lead unassigned
        await createNotification(
          'Lead Unassigned',
          `Lead "${currentLead.assignment_name}" has been unassigned`,
          'lead_updated',
          leadId,
          'lead'
        );
      }
    }

    if (updates.stage && updates.stage !== currentLead.stage) {
      await createNotification(
        'Lead Stage Updated',
        `Lead "${currentLead.assignment_name}" stage changed from "${currentLead.stage}" to "${updates.stage}"`,
        'lead_updated',
        leadId,
        'lead'
      );
    }

    if (updates.priority && updates.priority !== currentLead.priority) {
      await createNotification(
        'Lead Priority Updated',
        `Lead "${currentLead.assignment_name}" priority changed from "${currentLead.priority}" to "${updates.priority}"`,
        'lead_updated',
        leadId,
        'lead'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let permissions: any;
    try {
      let sessionStr = agentSession.value;
      if (sessionStr.includes('%')) {
        sessionStr = decodeURIComponent(sessionStr);
      }
      const sessionData = JSON.parse(sessionStr);
      const agent = sessionData.user || sessionData;
      permissions = agent.permissions;

      if (!permissions?.leads?.includes('enable_disable')) {
        return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();

    // Get current lead data for comparison
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !currentLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Permission Logic
    // Check if assignment is changing
    const newAssignedTo = body.assigned_to === undefined ? currentLead.assigned_to : body.assigned_to;
    // Note: body.assigned_to might be null.

    // Normalize comparison (handle null vs undefined vs string/number mismatch if any)
    const isAssignmentChange = String(newAssignedTo) !== String(currentLead.assigned_to);
    // Wait, if both are null/undefined? String(null) is "null". String(undefined) is "undefined".
    // If body.assigned_to is null and current is null -> "null" === "null" -> false (no change). Correct.

    if (isAssignmentChange) {
      if (!permissions?.leads?.includes('transfer_lead')) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to transfer leads' }, { status: 403 });
      }
    }

    // Check if other fields are changing or being set (PUT implies setting all provided)
    // Since PUT usually updates the record, we almost always require 'edit', unless we only changed assignment?
    // In strict REST, PUT replaces. So if we replace everything, we need edit.
    // However, if we ONLY changed assignment and kept everything else exactly same, maybe we don't need edit?
    // But realistically, user needs 'edit' to even open the edit form usually.
    // Let's enforce 'edit' generally for PUT, unless we want to allow "Transfer Only" role to use PUT?
    // A "Transfer Only" role probably uses a specific "Assign" endpoint or PATCH.
    // So enforcing 'edit' for general PUT (Leads update) seems correct, separate from transfer.
    // BUT the previous logic required `edit` for everything.
    // If I split it, an agent with `edit` but NO `transfer` should be able to PUT if `assigned_to` is unchanged.

    if (!permissions?.leads?.includes('edit')) {
      // If no edit permission, we allow ONLY if this is purely a transfer (which is rare for PUT).
      // Actually, if they don't have edit, they shouldn't use PUT to update details.
      // But if they have Transfer, they might use a tool that uses PUT?
      // Safest: Require Edit for any field change OTHER than assigned_to.
      // But PUT sends all fields. We'd have to compare all fields.
      // Simplification: Require 'edit' for PUT always, UNLESS it's arguably better to check changes.
      // Given the complexity, and that `transfer_lead` is an *additional* restriction usually (Edit + Transfer), or "Manager" (Transfer only)?
      // If Manager (Transfer only) wants to assign, they should use a UI that calls PATCH.
      // So for PUT (Edit Lead form), requiring 'edit' permission is standard.

      // So:
      // 1. Must have 'edit'.
      // 2. If assigning distinct user, Must also have 'transfer_lead'.

      return NextResponse.json({ error: 'Access Denied: No edit permission' }, { status: 403 });
    }

    const updates = {
      assignment_name: body.assignment_name,
      contact_id: body.contact_id || null,
      company_id: body.company_id || null,
      stage: body.stage,
      service: body.service || null,
      amount: body.amount || null,
      closing_date: body.closing_date || null,
      source: body.source || null,
      priority: body.priority || 'Medium',
      assigned_to: body.assigned_to || null,
      description: body.description || null,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Create notification for assignment changes
    if (isAssignmentChange) { // Use our detected flag
      if (body.assigned_to) {
        try {
          const { data: agent } = await supabase
            .from('agents')
            .select('full_name, username')
            .eq('id', body.assigned_to)
            .single();
          if (agent) {
            await createNotification(
              'Lead Updated & Assigned',
              `Lead "${body.assignment_name}" has been updated and assigned to ${agent.full_name || agent.username}`,
              'lead_assigned',
              leadId,
              'lead'
            );
          }
        } catch (error) {
          console.error('Error creating assignment notification:', error);
        }
      } else if (currentLead.assigned_to) {
        await createNotification(
          'Lead Updated & Unassigned',
          `Lead "${body.assignment_name}" has been updated and unassigned`,
          'lead_updated',
          leadId,
          'lead'
        );
      }
    } else {
      await createNotification(
        'Lead Updated',
        `Lead "${body.assignment_name}" has been updated`,
        'lead_updated',
        leadId,
        'lead'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      let sessionStr = agentSession.value;
      if (sessionStr.includes('%')) {
        sessionStr = decodeURIComponent(sessionStr);
      }
      const sessionData = JSON.parse(sessionStr);
      const agent = sessionData.user || sessionData;
      const permissions = agent.permissions;

      if (!permissions?.leads?.includes('enable_disable')) {
        return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
      }
      if (!permissions?.leads?.includes('delete')) {
        return NextResponse.json({ error: 'Access Denied: No delete permission' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get lead info before deletion for notification
    const { data: lead } = await supabase.from('leads').select('assignment_name').eq('id', leadId).single();

    const { error } = await supabase.from('leads').delete().eq('id', leadId);

    if (error) throw error;

    if (lead) {
      await createNotification(
        'Lead Deleted',
        `Lead "${lead.assignment_name}" has been deleted`,
        'warning',
        leadId,
        'lead'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}