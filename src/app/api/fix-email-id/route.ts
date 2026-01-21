
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
    if (!supabaseAdmin) return NextResponse.json({ error: 'No admin' }, { status: 500 });

    // Update the specific record to point to Agent 13
    const { data, error } = await supabaseAdmin
        .from('workspace_emails')
        .update({ assigned_agent_id: '13' })
        .eq('email', 'cso@consolegal.com')
        .select();

    return NextResponse.json({ success: true, data, error });
}
