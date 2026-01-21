import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabase
            .from('company_key_persons')
            .select('*')
            .eq('company_id', id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json(data || null);
    } catch (error) {
        console.error('Error fetching key person:', error);
        return NextResponse.json(
            { error: 'Failed to fetch key person' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, mobile, designation, email } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('company_key_persons')
            .upsert({
                company_id: id,
                name,
                mobile,
                designation,
                email,
                updated_at: new Date().toISOString()
            }, { onConflict: 'company_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error saving key person:', error);
        return NextResponse.json(
            { error: 'Failed to save key person' },
            { status: 500 }
        );
    }
}
