import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from '@/app/lib/session';

// Helper to get agent session
function getAgentSession(req: NextRequest) {
  const agentSession = req.cookies.get('agent_session');
  if (agentSession) {
    try {
      const sessionData = JSON.parse(agentSession.value);
      return sessionData.user || sessionData;
    } catch (e) {
      return null;
    }
  }
  // Fallback to regular session for non-agents
  const session = getSessionFromRequest(req);
  return session?.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = getAgentSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (countError) throw countError;

    return NextResponse.json({
      notifications,
      unreadCount: count || 0
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAgentSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, type, related_id, related_type } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Insert notification
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          title,
          message,
          type: type || 'info',
          related_id: related_id || null,
          related_type: related_type || null
        }
      ])
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      id: data.id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getAgentSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'mark-all-read') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const { id, is_read } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: is_read ? true : false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}