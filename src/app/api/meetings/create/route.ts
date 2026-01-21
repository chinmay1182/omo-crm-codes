
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { sendMeetingInvite } from '@/app/lib/emailUtils';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');

        if (!agentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let agentId;
        try {
            const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
            agentId = agent.id;
            const permissions = agent.permissions;
            if (!permissions?.meetings?.includes('enable_disable')) {
                return NextResponse.json({ error: 'Access Denied: Meetings module disabled' }, { status: 403 });
            }
            if (!permissions?.meetings?.includes('create')) {
                return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const body = await req.json();
        const {
            title,
            description,
            start_time,
            duration, // in minutes
            type, // 'online' | 'offline'
            location,
            meeting_link,
            participants,
            company_id,
            client_email,
            client_name
        } = body;

        // Validate required
        if (!title || !start_time || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Insert into DB
        const { data, error } = await supabase
            .from('company_meetings')
            .insert({
                title,
                description,
                meeting_date: start_time,
                duration: duration || 60,
                type,
                location: type === 'offline' ? location : null,
                meeting_link: type === 'online' ? meeting_link : null,
                participants,
                company_id: company_id || null,
                client_email,
                client_name,
                status: 'scheduled'
            })
            .select()
            .single();

        if (error) throw error;

        // Send Email Invite using user's credentials from database
        if (client_email && agentId) {
            // Fetch user's email credentials from database
            const { data: emailCreds } = await supabase
                .from('email_credentials')
                .select('email, password, smtp_host, smtp_port')
                .eq('user_id', agentId)
                .eq('is_active', true)
                .single();

            const userCredentials = emailCreds ? {
                email: emailCreds.email,
                password: emailCreds.password,
                smtpHost: emailCreds.smtp_host,
                smtpPort: emailCreds.smtp_port
            } : undefined;

            await sendMeetingInvite(data, userCredentials);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating meeting:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
