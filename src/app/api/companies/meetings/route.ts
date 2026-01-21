import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const {
      companyId,
      title,
      description,
      start_time,
      end_time,
      location,
      participants,
      createGoogleMeet
    } = await request.json();

    // Check Agent Permissions and Get ID
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let createdBy: any = null; // can be integer or string depending on DB, likely null if not agent
    let agentPermissions: any = null;

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        agentPermissions = agent.permissions;

        if (agentPermissions?.meetings?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Meetings module disabled' }, { status: 403 });
        }
        if (!agentPermissions?.meetings?.create) {
          return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
        }
        if (agent.id) createdBy = agent.id;
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    if (!companyId || !title || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const start = new Date(start_time);
    const end = new Date(end_time);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    const { data, error } = await supabase
      .from('company_meetings')
      .insert([
        {
          company_id: companyId,
          title,
          description: description || null,
          meeting_date: start_time, // Map start_time to meeting_date
          duration: duration, // Map end_time to duration
          location: location || null,
          // participants: participants || null, // participants column might not exist in DB schema based on 04 migration
          created_by: createdBy
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        message: createGoogleMeet
          ? 'Meeting created, proceed with Google OAuth'
          : 'Meeting scheduled successfully',
        meetingId: data.id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return NextResponse.json(
      { error: 'Failed to schedule meeting' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let agentId: string | null = null;
    let agentPermissions: any = null;

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        agentId = agent.id;
        agentPermissions = agent.permissions;

        if (agentPermissions?.meetings?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Meetings module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    let query = supabase
      .from('company_meetings')
      .select('*')
      .eq('company_id', companyId)
      .order('meeting_date', { ascending: true }); // Sort by meeting_date

    // Enforce View Permissions
    if (agentPermissions) {
      const canViewAll = agentPermissions.meetings?.includes('view_all');
      const canViewAssigned = agentPermissions.meetings?.includes('view_assigned');

      if (!canViewAll) {
        if (canViewAssigned && agentId) {
          query = query.eq('created_by', agentId);
        } else {
          return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
      }
    }

    const { data: meetings, error } = await query;

    if (error) throw error;

    const formattedMeetings = meetings?.map((meeting: any) => {
      // Create start_time from meeting_date
      const startTime = new Date(meeting.meeting_date);
      // Calculate end_time based on duration (default 60 mins if not present)
      const durationInMs = (meeting.duration || 60) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationInMs);

      return {
        ...meeting,
        start_time: meeting.meeting_date,
        end_time: endTime.toISOString()
      };
    }) || [];

    return NextResponse.json(formattedMeetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}