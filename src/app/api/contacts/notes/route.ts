import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionOrAgent } from '@/app/lib/auth-helper';

export async function GET(req: Request) {
  try {
    const session = await getSessionOrAgent(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching contact notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrAgent(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId, title = '', content = '' } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Insert note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        title: title || null,
        content: content,
        contact_id: contactId,
        related_to: 'contact',
        user_id: String(session.user.id),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (noteError) throw noteError;

    return NextResponse.json({
      success: true,
      id: note.id
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}