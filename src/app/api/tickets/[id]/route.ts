
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Permission Check
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let agentPermissions;
    let agentId;

    try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        agentPermissions = agent.permissions;
        agentId = agent.id;

        if (!agentPermissions?.tickets?.includes('enable_disable')) {
            return NextResponse.json({ error: 'Access Denied: Tickets module disabled' }, { status: 403 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('tickets')
        .select(`
      *,
      comments:ticket_comments(
        id,
        content,
        created_at,
        created_by,
        is_internal
      )
    `)
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Enforce View Scope
    const canViewAll = agentPermissions.tickets?.includes('view_all');
    const canViewAssigned = agentPermissions.tickets?.includes('view_assigned');

    if (!canViewAll) {
        if (canViewAssigned) {
            // Strict check: Must be assigned to this agent
            if (data.assigned_to !== agentId) {
                return NextResponse.json({ error: 'Access Denied: You can only view tickets assigned to you' }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
    }

    return NextResponse.json(data);
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Permission Check
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.tickets?.includes('enable_disable')) {
            return NextResponse.json({ error: 'Access Denied: Tickets module disabled' }, { status: 403 });
        }

        // Granular Permission Checks
        const isAssignmentChange = body.assigned_to !== undefined;
        // Check if there are other changes besides assignment (e.g. status, priority, notes)
        // We filter out 'assigned_to' and 'updated_at' (which we add later) to see if edit is needed.
        const otherKeys = Object.keys(body).filter(k => k !== 'assigned_to');
        const isOtherEdit = otherKeys.length > 0;

        if (isAssignmentChange) {
            if (!permissions?.tickets?.includes('transfer_ticket')) {
                return NextResponse.json({ error: 'Access Denied: You do not have permission to transfer tickets' }, { status: 403 });
            }
        }

        if (isOtherEdit) {
            if (!permissions?.tickets?.includes('edit')) {
                return NextResponse.json({ error: 'Access Denied: No edit permission' }, { status: 403 });
            }
        }

    } catch (e) {
        return NextResponse.json({ error: 'Invalid session/permissions' }, { status: 401 });
    }

    // Fetch current ticket state to check status
    const { data: currentTicket, error: fetchError } = await supabase
        .from('tickets')
        .select('status, updated_at')
        .eq('id', id)
        .single();

    if (fetchError) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Determine updated_at timestamp
    // If ticket is currently Closed/Deferred and status is NOT changing, preserve the old updated_at
    // This ensures SLA calculation (which depends on updated_at for closed tickets) doesn't jump due to minor edits (notes, etc)
    let newUpdatedAt = new Date().toISOString();

    // Check if status provided in body matches current status (or is undefined/null)
    const isStatusChanging = body.status && body.status !== currentTicket.status;
    const isCurrentlyStopped = ['Closed', 'Deferred'].includes(currentTicket.status);

    if (isCurrentlyStopped && !isStatusChanging) {
        newUpdatedAt = currentTicket.updated_at;
    }

    const updateData = {
        ...body,
        updated_at: newUpdatedAt
    };

    const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Permission Check
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (!agentSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.tickets?.includes('enable_disable')) {
            return NextResponse.json({ error: 'Access Denied: Tickets module disabled' }, { status: 403 });
        }
        if (!permissions?.tickets?.includes('delete')) {
            return NextResponse.json({ error: 'Access Denied: No delete permission' }, { status: 403 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
