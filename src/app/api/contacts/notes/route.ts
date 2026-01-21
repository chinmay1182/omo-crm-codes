import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { data: notes, error } = await supabase
      .from('contact_notes')
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
    const { contactId, title, content, tags } = await req.json();

    if (!contactId || !title || !content) {
      return NextResponse.json(
        { error: 'Contact ID, title, and content are required' },
        { status: 400 }
      );
    }

    // Insert note
    // Insert note
    const { data: note, error: noteError } = await supabase
      .from('contact_notes')
      .insert({
        contact_id: contactId,
        content: `**${title}**\n\n${content}`, // Pack title
        tags: tags || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (noteError) throw noteError;

    // Redundant activity logging removed (GET activities now aggregates notes)

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