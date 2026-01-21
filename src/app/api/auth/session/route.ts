import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/app/lib/session';

export async function GET(req: NextRequest) {
  try {
    // 1. Check Standard Session
    const session = getSessionFromRequest(req);
    if (session?.user) {
      return NextResponse.json({ user: session.user });
    }

    // 2. Check Agent Session (Fallback)
    const agentSession = req.cookies.get('agent_session');
    if (agentSession) {
      try {
        let sessionStr = agentSession.value;
        if (sessionStr.includes('%')) {
          sessionStr = decodeURIComponent(sessionStr);
        }
        const sessionData = JSON.parse(sessionStr);
        const agent = sessionData.user || sessionData;

        if (agent) {
          // Add 'type' if missing to distinguish
          return NextResponse.json({
            user: { ...agent, type: 'agent' }
          });
        }
      } catch (e) {
        // failed to parse
      }
    }

    // No valid session found
    return NextResponse.json({ user: null }, { status: 401 });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}