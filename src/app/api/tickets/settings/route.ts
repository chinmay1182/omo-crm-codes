
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
    const { data, error } = await supabase
        .from('ticket_settings')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // group by type
    const settings = {
        subjects: data.filter((s: any) => s.setting_type === 'subject'),
        categories: data.filter((s: any) => s.setting_type === 'category'),
        sources: data.filter((s: any) => s.setting_type === 'source'),
    };

    return NextResponse.json(settings);
}

export async function POST(request: Request) {
    const body = await request.json();

    const { data, error } = await supabase
        .from('ticket_settings')
        .insert([
            {
                setting_type: body.setting_type,
                value: body.value,
            }
        ])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('ticket_settings')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
