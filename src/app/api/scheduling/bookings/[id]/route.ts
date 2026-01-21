import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// GET single booking
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                event_types (
                    title,
                    duration,
                    slug
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('Failed to fetch booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE booking
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { id } = await params;
        const { attendee_name, attendee_email, start_time, end_time, status } = body;

        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                attendee_name,
                attendee_email,
                start_time,
                end_time,
                status
                // notes, // Column missing in DB
                // updated_at: new Date().toISOString() // Column missing in DB
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('Failed to update booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE booking
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Booking deleted successfully' });
    } catch (error: any) {
        console.error('Failed to delete booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
