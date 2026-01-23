import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function GET(request: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
        return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('agent_meeting_apis')
            .select('*')
            .eq('agent_id', agentId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
            throw error;
        }

        return NextResponse.json(data || {});
    } catch (error: any) {
        console.error('Error fetching API settings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
    }
    try {
        const body = await request.json();
        const { agentId, ...apiDetails } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
        }

        // Map frontend fields to DB columns
        const dbPayload = {
            agent_id: agentId,
            google_client_id: apiDetails.clientId,
            google_client_secret: apiDetails.clientSecret,
            google_redirect_uri: apiDetails.redirectUri,
            google_api_key: apiDetails.apiKey
        };

        // Check if exists
        const { data: existing } = await supabaseAdmin
            .from('agent_meeting_apis')
            .select('id')
            .eq('agent_id', agentId)
            .single();

        let error;
        if (existing) {
            const res = await supabaseAdmin
                .from('agent_meeting_apis')
                .update(dbPayload)
                .eq('agent_id', agentId);
            error = res.error;
        } else {
            const res = await supabaseAdmin
                .from('agent_meeting_apis')
                .insert([dbPayload]);
            error = res.error;
        }

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving API settings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
