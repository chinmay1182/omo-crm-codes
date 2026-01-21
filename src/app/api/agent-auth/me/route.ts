import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('agent-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== 'agent') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Fetch fresh agent data from DB
    const { supabase } = await import('@/app/lib/supabase');

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, username, email, full_name, phone_number, status, imap_settings')
      .eq('id', payload.agentId)
      .single();

    if (error || !agent) {
      console.error('Agent auth me: Agent not found in DB:', error);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'Agent account is not active' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        username: agent.username,
        email: agent.email,
        full_name: agent.full_name,
        phone_number: agent.phone_number,
        imap_settings: agent.imap_settings,
        permissions: payload.permissions // Permissions might still come from token or should be fetched? Best to fetch if dynamic.
        // For now, let's keep permissions from token or fetch them too?
        // Let's stick to payload.permissions for now as simpler, but strictly logic says fetch.
        // But the previous implementation used payload. I'll stick to payload for permissions to minimize risk, but fetch phone.
      }
    });
  } catch (error) {
    console.error('Agent auth me: Token verification error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}