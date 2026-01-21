import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
    try {
        // Fetch all bookings with event type details
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                event_types (
                    title,
                    duration,
                    slug
                )
            `)
            .order('start_time', { ascending: false });

        if (error) throw error;

        // Transform the data to match the expected format
        const transformedBookings = bookings?.map(booking => ({
            id: booking.id,
            title: booking.event_types?.title || 'Booking',
            start_time: booking.start_time,
            end_time: booking.end_time,
            client_name: booking.attendee_name,
            client_email: booking.attendee_email,
            attendee_mobile: booking.attendee_mobile,
            company_name: booking.company_name,
            participant_type: booking.participant_type,
            type: booking.participant_type || 'online',
            status: booking.status,
            event_type_slug: booking.event_types?.slug,
            duration: booking.event_types?.duration,
            notes: booking.notes || null
        })) || [];

        return NextResponse.json(transformedBookings);
    } catch (error: any) {
        console.error('Failed to fetch bookings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
