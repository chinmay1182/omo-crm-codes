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

        const sanitizedBody = {
            ...body,
            sale_price: body.sale_price === '' ? null : body.sale_price,
            purchase_price: body.purchase_price === '' ? null : body.purchase_price,
            qty_in_numbers: body.qty_in_numbers === '' ? null : body.qty_in_numbers,
            alt_qty_in_numbers: body.alt_qty_in_numbers === '' ? null : body.alt_qty_in_numbers,
            discount_value: body.discount_value === '' ? null : body.discount_value,
            gst_rate: body.gst_rate === '' ? null : body.gst_rate,
            opening_qty: body.opening_qty === '' ? null : body.opening_qty,
            best_before_months: body.best_before_months === '' ? null : body.best_before_months,
            expiry_date: body.expiry_date === '' ? null : body.expiry_date,
            unit_type_na: body.unit_type_na || false
        };

        const { data, error } = await supabase
            .from('products')
            .insert([{
                ...sanitizedBody,
                product_code,
                agent_id: agentId
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error saving product:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
