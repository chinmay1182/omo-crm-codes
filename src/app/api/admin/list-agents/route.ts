import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error: Admin client not available' }, { status: 503 });
        }

        // Fetch agents using admin client to bypass RLS/Auth checks
        // This is for the Admin Dropdown, so we just need ID and Names
        const { data: agents, error } = await supabaseAdmin
            .from('agents')
            .select('id, email, full_name, username')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ agents });
    } catch (error: any) {
        console.error('Fetch agents error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
