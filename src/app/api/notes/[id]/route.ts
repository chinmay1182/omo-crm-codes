import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionOrAgent } from '@/app/lib/auth-helper';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrAgent(request);
    const { id } = await params; // Await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      content,
      is_starred,
      is_completed,
      company_id,
      contact_id,
      related_to
    } = await request.json();

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) {
      updates.content = content;
      if (content.length > 1000) return NextResponse.json({ error: 'Content too long' }, { status: 400 });
    }
    if (is_starred !== undefined) updates.is_starred = is_starred;
    if (is_completed !== undefined) updates.is_completed = is_completed;
    if (company_id !== undefined) updates.company_id = company_id;
    if (contact_id !== undefined) updates.contact_id = contact_id;
    if (related_to !== undefined) updates.related_to = related_to;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', String(session.user.id));

    if (error) throw error;

    // Check if it actually updated ? Supabase default does not return count unless specified, but if no error usually fine.
    // If strict 404 needed for ownership:
    // We could do a select first, or use .select() in update to see if it returned anything.

    // Re-check:
    /** 
     * const { data } = await supabase.from('notes').update(updates).eq('id', params.id).eq('user_id', session.user.id).select();
     * if (!data || data.length === 0) return 404
     */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrAgent(request);
    const { id } = await params; // Await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('notes')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', String(session.user.id));

    if (error) throw error;

    if (count === 0) {
      return NextResponse.json(
        { error: 'Note not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}