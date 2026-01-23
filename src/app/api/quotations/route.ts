import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';
import { cookies } from 'next/headers';

const generateQuoteId = customAlphabet('0123456789', 6);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('product_quotations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');
        let agentId = null;

        if (agentSession) {
            try {
                const sessionData = JSON.parse(agentSession.value);
                agentId = sessionData.user?.id || sessionData.id;
            } catch (e) { }
        }


        const quotation_id = `QT-${generateQuoteId()}`;

        const { data, error } = await supabase
            .from('product_quotations')
            .insert([{
                ...body,
                quotation_id,
                agent_id: agentId
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
