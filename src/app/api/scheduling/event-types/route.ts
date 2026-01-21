
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/app/lib/session';

// Use a service role client for server-side operations to bypass RLS when needed for agents
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let query = supabaseAdmin.from('event_types').select('*');

    if (session.user.type === 'agent') {
        const agentId = session.user.id || session.user.agentId;
        query = query.eq('agent_id', agentId);
    } else {
        query = query.eq('user_id', session.user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error && error.code !== '42P01') {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error?.code === '42P01') return NextResponse.json([]); // Table doesn't exist

    return NextResponse.json(data || []);
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, duration, description, header_text } = body;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 4);

    const insertData: any = {
        title,
        duration,
        description,
        slug,
        header_text: header_text || 'CONSOLEGAL CONSULTATION'
    };

    if (session.user.type === 'agent') {
        insertData.agent_id = session.user.id || session.user.agentId;
    } else {
        insertData.user_id = session.user.id;
    }

    const { data, error } = await supabaseAdmin
        .from('event_types')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error("Supabase Insert Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
