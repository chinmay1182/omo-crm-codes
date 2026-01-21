import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const { data: meetings, error } = await supabase
      .from('contact_meetings')
      .select('*')
      .eq('contact_id', contactId)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching contact meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const {
      contactId,
      title,
      description,
      start_time,
      end_time,
      location,
      participants,
      meeting_url
    } = await req.json();

    if (!contactId || !title || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Contact ID, title, start time, and end time are required' },
        { status: 400 }
      );
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('contact_meetings')
      .insert({
        contact_id: contactId,
        title,
        description: description || null,
        start_time,
        end_time,
        location: location || null,
        participants: participants || null,
        meeting_url: meeting_url || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Activity automatically tracked via View


    return NextResponse.json({
      success: true,
      id: meeting.id
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}