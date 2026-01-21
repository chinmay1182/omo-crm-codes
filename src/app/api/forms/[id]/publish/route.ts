
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { published } = body;

        const { data, error } = await supabase
            .from('forms')
            .update({ published })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
