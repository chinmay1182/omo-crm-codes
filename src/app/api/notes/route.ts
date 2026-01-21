import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionOrAgent } from '@/app/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const session = await getSessionOrAgent(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all', 'starred', 'completed'

    const userId = String(session.user.id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    let query = supabase
      .from('notes')
      .select(`
            *,
            companies ( name ),
            contacts ( first_name, last_name )
        `);

    if (isUuid) {
      query = query.eq('user_id', userId);
    } else {
      // For agents (numeric IDs), query using their ID as string
      query = query.eq('user_id', userId);
    }

    if (filter === 'starred') {
      query = query.eq('is_starred', true);
    } else if (filter === 'completed') {
      query = query.eq('is_completed', true);
    } else if (filter === 'active') {
      query = query.eq('is_completed', false);
    }

    const { data: notes, error } = await query.order('is_starred', { ascending: false }).order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') return NextResponse.json({ notes: [] });
      throw error;
    }

    // Flatten structure to match legacy format
    const formattedNotes = notes.map((n: any) => ({
      ...n,
      company_name: n.companies?.name,
      contact_first_name: n.contacts?.first_name,
      contact_last_name: n.contacts?.last_name
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionOrAgent(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      content,
      is_starred = false,
      is_completed = false,
      company_id = null,
      contact_id = null,
      related_to = 'none'
    } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Content must be less than 1000 characters' },
        { status: 400 }
      );
    }

    const userId = String(session.user.id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    const insertData: any = {
      title,
      content,
      is_starred,
      is_completed,
      company_id,
      contact_id,
      related_to
    };

    if (isUuid) {
      insertData.user_id = userId;
    } else {
      // For agents (numeric IDs), store as string in user_id
      // This allows agents to create notes without requiring a separate agent_id column
      insertData.user_id = userId;
    }

    const { data: newNote, error } = await supabase
      .from('notes')
      .insert([insertData])
      .select(`
            *,
            companies ( name ),
            contacts ( first_name, last_name )
        `)
      .single();

    if (error) throw error;

    const formattedNote = {
      ...newNote,
      company_name: newNote.companies?.name,
      contact_first_name: newNote.contacts?.first_name,
      contact_last_name: newNote.contacts?.last_name
    };

    return NextResponse.json({ note: formattedNote }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}