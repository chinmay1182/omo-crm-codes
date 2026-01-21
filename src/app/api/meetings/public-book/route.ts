
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { sendAdminNotification, sendBookingConfirmation } from '@/app/lib/emailUtils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            client_name,
            client_email,
            title, // Topic
            preferred_date, // DateTime string
            description
        } = body;

        if (!client_name || !client_email || !preferred_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Insert with status 'pending'
        const { data, error } = await supabase
            .from('company_meetings')
            .insert({
                title: title || `Meeting with ${client_name}`,
                description,
                meeting_date: preferred_date,
                duration: 30, // Default 30 mins for requests
                type: 'online',
                status: 'pending',
                client_email,
                client_name
            })
            .select()
            .single();

        if (error) throw error;

        // Send booking confirmation to client
        if (client_email) {
            await sendBookingConfirmation(data, { title: title || `Meeting with ${client_name}`, duration: 30 });
        }

        // Notify Admin
        await sendAdminNotification(data);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error booking meeting:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
