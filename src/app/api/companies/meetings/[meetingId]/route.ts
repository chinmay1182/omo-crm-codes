import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

async function checkPermission(permission: string) {
  const cookieStore = await cookies();
  const agentSession = cookieStore.get('agent_session');
  if (!agentSession) return { allowed: false, error: 'Unauthorized', status: 401 };

  try {
    let val = agentSession.value;
    if (val.includes('%')) val = decodeURIComponent(val);
    const sessionData = JSON.parse(val);
    const agent = sessionData.user || sessionData;
    const permissions = agent.permissions;

    if (!permissions?.meetings?.includes('enable_disable')) {
      return { allowed: false, error: 'Access Denied: Meetings module disabled', status: 403 };
    }
    if (!permissions?.meetings?.includes(permission)) {
      return { allowed: false, error: `Access Denied: No ${permission} permission`, status: 403 };
    }
    return { allowed: true };
  } catch (e) {
    return { allowed: false, error: 'Invalid session', status: 401 };
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const perm = await checkPermission('edit');
  if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status });

  try {
    const { meetingId } = await params;
    const body = await request.json();

    // Fields to update
    const { title, description, meeting_notes, start_time, end_time, location, participants, type, meeting_link, client_name, client_email, status } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (meeting_notes !== undefined) updates.meeting_notes = meeting_notes; // Add meeting_notes support
    if (location !== undefined) updates.location = location;
    if (type) updates.type = type;
    if (meeting_link !== undefined) updates.meeting_link = meeting_link;
    if (client_name !== undefined) updates.client_name = client_name;
    if (client_email !== undefined) updates.client_email = client_email;
    if (status) updates.status = status;
    // participants removed as per schema check
    // if (participants !== undefined) updates.participants = participants;

    // Handle Date/Time updates
    if (start_time || end_time) {
      let start = start_time ? new Date(start_time) : null;
      let end = end_time ? new Date(end_time) : null;

      // If either is missing, we need the existing record to calculate duration correctly
      if (!start || !end) {
        const { data: existing, error: fetchError } = await supabase
          .from('company_meetings')
          .select('meeting_date, duration')
          .eq('id', meetingId)
          .single();

        if (fetchError || !existing) throw fetchError || new Error('Meeting not found');

        if (!start) start = new Date(existing.meeting_date);
        if (!end) {
          // Calculate existing end time
          const durationMs = (existing.duration || 60) * 60 * 1000;
          end = new Date(start!.getTime() + durationMs);
        }
      }

      if (start && end) {
        updates.meeting_date = start.toISOString();
        updates.duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
    }

    const { error } = await supabase
      .from('company_meetings')
      .update(updates)
      .eq('id', meetingId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Meeting updated successfully' });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

// PATCH handler for partial updates (like saving notes)
export async function PATCH(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const perm = await checkPermission('edit');
  if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status });

  try {
    const { meetingId } = await params;
    const body = await request.json();

    const updates: any = {
      updated_at: new Date().toISOString(),
      ...body // Allow any field to be updated
    };

    const { error } = await supabase
      .from('company_meetings')
      .update(updates)
      .eq('id', meetingId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Meeting updated successfully' });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}


export async function DELETE(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const perm = await checkPermission('delete');
  if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status });

  try {
    const { meetingId } = await params;

    const { error } = await supabase
      .from('company_meetings')
      .delete()
      .eq('id', meetingId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
