import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { supabase } from '@/app/lib/supabase'; // Fallback client

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Use admin client if available, else standard client (requires RLS policy)
        const client = supabaseAdmin || supabase;

        // Select all configs
        const { data, error } = await client
            .from('workspace_emails')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ configs: data });
    } catch (error: any) {
        console.error('Fetch config error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
