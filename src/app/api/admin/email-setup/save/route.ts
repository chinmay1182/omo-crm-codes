import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function POST(req: Request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error: Admin client not available' }, { status: 500 });
        }

        const body = await req.json();
        const { email, app_password, assigned_agent_id, agent_name } = body;

        if (!email || !app_password || !assigned_agent_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Insert using admin client to bypass RLS
        const { data, error } = await supabaseAdmin
            .from('workspace_emails')
            .insert([
                {
                    email,
                    app_password,
                    assigned_agent_id,
                    agent_name
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Database insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Save config error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
