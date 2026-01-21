import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from '@/app/lib/session';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function GET(request: NextRequest) {
    try {
        // 1. Check for Agent Token
        const agentToken = request.cookies.get('agent-token')?.value;
        if (agentToken) {
            try {
                const { payload } = await jwtVerify(agentToken, JWT_SECRET);
                if (payload.type === 'agent' && payload.agentId) {
                    const { data: agent, error } = await supabase
                        .from('agents')
                        .select('imap_settings')
                        .eq('id', payload.agentId)
                        .single();

                    if (error) {
                        console.error('IMAP Settings GET: Agent DB Error:', error);
                    }

                    if (agent) {
                        return NextResponse.json({ settings: agent.imap_settings });
                    }
                }
            } catch (e) {
                console.error('IMAP Settings GET: Agent token error:', e);
            }
        }

        // 2. Check for Custom Session (Admin/User)
        const session = getSessionFromRequest(request);

        if (session?.user?.id) {
            const userId = session.user.id;

            const { data: user, error } = await supabase
                .from('users')
                .select('imap_settings')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('IMAP Settings GET: DB Error:', error);
            }

            if (user) {

                return NextResponse.json({ settings: user.imap_settings });
            } else {
            }
        } else {
        }

        return NextResponse.json({ settings: null });

    } catch (error) {
        console.error('Get IMAP Settings Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 1. Check for Agent Token
        const agentToken = request.cookies.get('agent-token')?.value;
        if (agentToken) {
            try {
                const { payload } = await jwtVerify(agentToken, JWT_SECRET);
                if (payload.type === 'agent' && payload.agentId) {
                    await supabase.from('agents').update({ imap_settings: body }).eq('id', payload.agentId);
                    return NextResponse.json({ success: true });
                }
            } catch (e) { }
        }

        // 2. Check for Custom Session (Admin/User)
        const session = getSessionFromRequest(request);
        if (session?.user?.id) {
            const userId = session.user.id;
            const { error } = await supabase.from('users').update({ imap_settings: body }).eq('id', userId);
            if (error) {
                console.error('IMAP Settings POST: DB Error:', error);
                throw error;
            }
            return NextResponse.json({ success: true });
        }


        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    } catch (error) {
        console.error('Save IMAP Settings Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
