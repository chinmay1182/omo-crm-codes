import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { getSession } from '@/app/lib/session';

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
        }

        const userId = String(session.user.id);

        const { data, error } = await supabaseAdmin
            .from('workspace_emails')
            .select('signature')
            .eq('assigned_agent_id', userId)
            .single();

        if (error) {
            // It's possible no email is assigned yet
            return NextResponse.json({ signature: '' });
        }

        return NextResponse.json({ signature: data.signature || '' });
    } catch (error) {
        console.error('Error fetching signature:', error);
        return NextResponse.json({ error: 'Failed to fetch signature' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
        }

        const userId = String(session.user.id);
        const { signature } = await req.json();

        // Update signature for the assigned email
        const { error } = await supabaseAdmin
            .from('workspace_emails')
            .update({ signature })
            .eq('assigned_agent_id', userId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving signature:', error);
        return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
    }
}
