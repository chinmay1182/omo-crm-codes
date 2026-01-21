import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(req: Request) {
    try {
        const body = await req.json();


        const {
            event_type_id,
            host_user_id,
            attendee_name,
            attendee_email,
            attendee_mobile,
            company_name,
            participant_type,
            start_time,
            end_time,
            notes
        } = body;

        // Validate required fields
        if (!event_type_id || !attendee_name || !attendee_email || !start_time || !end_time) {
            console.error('Missing required fields');
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['event_type_id', 'attendee_name', 'attendee_email', 'start_time', 'end_time']
            }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        let supabaseClient = supabase;

        if (supabaseUrl && supabaseServiceKey) {
            supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        } else {
            console.warn('Using Anon Client - RLS policies must allow public insert');
        }

        // Prepare insert data - only include fields that actually exist in DB schema
        const insertData: any = {
            event_type_id,
            attendee_name,
            attendee_email,
            start_time,
            end_time,
            status: 'confirmed'
        };

        // Add optional fields
        if (host_user_id) insertData.host_user_id = host_user_id;
        if (attendee_mobile) insertData.attendee_mobile = attendee_mobile;
        if (company_name) insertData.company_name = company_name;
        if (participant_type) insertData.participant_type = participant_type;
        if (notes) insertData.notes = notes;


        const { data: booking, error } = await supabaseClient
            .from('bookings')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('=== Supabase Insert Error ===');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            console.error('Error Details:', JSON.stringify(error, null, 2));
            console.error('=== End Error ===');

            return NextResponse.json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            }, { status: 500 });
        }


        // Fetch Host Details (including Tokens)
        if (host_user_id) {
            const { data: agent } = await supabaseClient
                .from('agents')
                .select('email, username, google_refresh_token')
                .eq('id', host_user_id)
                .single();

            if (agent && agent.email) {
                let meetLink = null;

                // 1. Try Creating Google Meet
                if (agent.google_refresh_token) {
                    try {
                        const { oauth2Client, createGoogleMeet } = await import('@/app/lib/googleAuth');
                        oauth2Client.setCredentials({ refresh_token: agent.google_refresh_token });

                        const meetResult = await createGoogleMeet(oauth2Client, {
                            title: `Meeting: ${attendee_name} & ${agent.username || 'Consolegal'}`,
                            startTime: start_time,
                            endTime: end_time,
                            description: `Notes: ${notes || 'None'}`,
                            attendees: [attendee_email]
                        });

                        meetLink = meetResult.meetLink;

                        // Save Link to Booking
                        await supabaseClient
                            .from('bookings')
                            .update({ meeting_link: meetLink })
                            .eq('id', booking.id);

                    } catch (err) {
                        console.error('Google Meet Error:', err);
                    }
                }

                // 2. Send System Emails (Ensure delivery even if GMeet fails)
                const { sendMail } = await import('@/app/lib/email');

                // Email to Host
                await sendMail({
                    to: agent.email,
                    subject: 'New Booking Received - Consolegal',
                    html: `
                        <h2>New Booking Received</h2>
                        <p><strong>Attendee:</strong> ${attendee_name} (${attendee_email})</p>
                        <p><strong>Time:</strong> ${new Date(start_time).toLocaleString()}</p>
                        ${meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''}
                        <p><strong>Notes:</strong> ${notes || 'None'}</p>
                    `
                });

                // Email to Attendee
                await sendMail({
                    to: attendee_email,
                    subject: 'Booking Confirmed - Consolegal',
                    html: `
                        <h2>Booking Confirmed</h2>
                        <p>Hi ${attendee_name},</p>
                        <p>Your meeting with <strong>${agent.username || 'Consolegal'}</strong> is confirmed.</p>
                        <p><strong>Time:</strong> ${new Date(start_time).toLocaleString()}</p>
                        ${meetLink ? `<p><strong>Join Meeting:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''}
                        <p>A calendar invitation has also been sent to your email.</p>
                    `
                });
            }
        }


        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('=== Booking Exception ===');
        console.error('Exception:', error);
        console.error('Stack:', error.stack);
        console.error('=== End Exception ===');

        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            type: error.constructor.name
        }, { status: 500 });
    }
}
