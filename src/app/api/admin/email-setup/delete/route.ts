import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function POST(req: Request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error: Admin client not available' }, { status: 500 });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        // Delete using admin client to bypass RLS
        const { error } = await supabaseAdmin
            .from('workspace_emails')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Database delete error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete config error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
