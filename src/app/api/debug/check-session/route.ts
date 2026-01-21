import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');

        if (!agentSession) {
            return NextResponse.json({ error: 'No session found' }, { status: 401 });
        }

        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;

        return NextResponse.json({
            agent_id: agent.id,
            username: agent.username,
            roles: agent.roles,
            permissions: agent.permissions,
            raw_session: agent
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
