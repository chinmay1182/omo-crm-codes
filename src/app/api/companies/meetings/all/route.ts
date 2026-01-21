import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
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

        if (!agentPermissions?.meetings?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Meetings module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Select meeting_date explicitly
    let query = supabase
      .from('company_meetings')
      .select('*, companies(name)')
      .order('meeting_date', { ascending: false });

    // Enforce View Permissions
    if (agentPermissions) {
      const canViewAll = agentPermissions.meetings?.includes('view_all');
      const canViewAssigned = agentPermissions.meetings?.includes('view_assigned'); // Interpreted as 'view own meetings'

      if (!canViewAll) {
        if (canViewAssigned && agentId) {
          // created_by stores the user/agent ID
          // company_meetings uses integer/uuid created_by? Need to be careful.
          // Assuming it works like notes.
          query = query.eq('created_by', agentId);
        } else {
          return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
      }
    }

    if (date) {
      // The client sends local date (YYYY-MM-DD). We assume the user is in IST (UTC+05:30).
      // We construct ISO strings with the timezone offset so Postgres compares correctly against timestamptz.
      const startOfDay = `${date}T00:00:00+05:30`;
      const endOfDay = `${date}T23:59:59+05:30`;

      query = query.gte('meeting_date', startOfDay).lte('meeting_date', endOfDay);
    }

    const { data: meetings, error } = await query;

    if (error) throw error;

    const formattedMeetings = meetings.map((meeting: any) => {
      // Create start_time from meeting_date
      const startTime = new Date(meeting.meeting_date);
      // Calculate end_time based on duration (default 60 mins if not present)
      const durationInMs = (meeting.duration || 60) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationInMs);

      return {
        ...meeting,
        start_time: meeting.meeting_date, // Map meeting_date to start_time for frontend
        end_time: endTime.toISOString(),
        company_name: meeting.companies?.name
      };
    });

    return NextResponse.json(formattedMeetings);
  } catch (error) {
    console.error('Error fetching all meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}