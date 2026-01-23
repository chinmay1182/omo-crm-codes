import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { data, error } = await supabase
            .from('products')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
