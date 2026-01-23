
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { agentId, companySeal } = body;

        if (!agentId || !companySeal) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
        }

        // Bypass RLS with admin client
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const { error } = await supabaseAdmin
            .from('agents')
            .update({ company_seal: companySeal })
            .eq('id', agentId);

        if (error) {
            console.error('Error updating company seal:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
