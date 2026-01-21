
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
    if (!supabaseAdmin) return NextResponse.json({ error: 'No admin' }, { status: 500 });

    // Fix folder case
    const { data, error } = await supabaseAdmin
        .from('emails')
        .update({ folder: 'INBOX' })
        .eq('folder', 'inbox')
        .select();

    return NextResponse.json({ success: true, updated: data?.length, error });
}
