import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';
import { cookies } from 'next/headers';

const generateProductCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('products')
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

        // Generate unique product code
        const product_code = `PRD-${generateProductCode()}`;

        const { data, error } = await supabase
            .from('products')
            .insert([{
                ...body,
                product_code,
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
