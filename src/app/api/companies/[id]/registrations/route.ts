import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabase
            .from('company_registrations')
            .select('*')
            .eq('company_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch registrations' },
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
        const { registration_name, registration_number, start_date, end_date } = body;

        if (!registration_name || !registration_number) {
            return NextResponse.json({ error: 'Name and number are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('company_registrations')
            .insert({
                company_id: id,
                registration_name,
                registration_number,
                start_date: start_date || null,
                end_date: end_date || null
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error saving registration:', error);
        return NextResponse.json(
            { error: 'Failed to save registration' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const regId = searchParams.get('regId');

        if (!regId) {
            return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('company_registrations')
            .delete()
            .eq('id', regId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting registration:', error);
        return NextResponse.json(
            { error: 'Failed to delete registration' },
            { status: 500 }
        );
    }
}
