import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: tags, error } = await supabase
      .from('contact_tags')
      .select('id, name, type, contact_tag_assignments!inner(contact_id)')
      .eq('contact_tag_assignments.contact_id', id)
      .eq('type', 'contact_tag')
      .order('name');

    if (error) throw error;

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching contact tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact tags' },
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
    const { tagIds } = await request.json();

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds must be an array' },
        { status: 400 }
      );
    }

    // 1. Delete existing assignments
    const { error: deleteError } = await supabase
      .from('contact_tag_assignments')
      .delete()
      .eq('contact_id', id);

    if (deleteError) throw deleteError;

    // 2. Insert new assignments
    if (tagIds.length > 0) {
      const assignments = tagIds.map(tagId => ({
        contact_id: id,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('contact_tag_assignments')
        .insert(assignments);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ message: 'Contact tags updated successfully' });
  } catch (error) {
    console.error('Error updating contact tags:', error);
    return NextResponse.json(
      { error: 'Failed to update contact tags' },
      { status: 500 }
    );
  }
}