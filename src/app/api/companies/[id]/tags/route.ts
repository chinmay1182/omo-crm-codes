import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch tags assigned to the company
    const { data: assignments, error } = await supabase
      .from('company_tag_assignments')
      .select(`
        tag_id,
        contact_tags!inner (
          id,
          name,
          type
        )
      `)
      .eq('company_id', id)
      .eq('contact_tags.type', 'company_tag')
      .order('name', { referencedTable: 'contact_tags', ascending: true });

    if (error) throw error;

    // Flatten structure to match original output
    const tags = assignments.map((item: any) => item.contact_tags);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching company tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company tags' },
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

    // Remove existing tag assignments
    const { error: deleteError } = await supabase
      .from('company_tag_assignments')
      .delete()
      .eq('company_id', id);

    if (deleteError) throw deleteError;

    // Add new tag assignments
    if (tagIds.length > 0) {
      const assignments = tagIds.map(tagId => ({
        company_id: id,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('company_tag_assignments')
        .insert(assignments);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ message: 'Company tags updated successfully' });
  } catch (error) {
    console.error('Error updating company tags:', error);
    return NextResponse.json(
      { error: 'Failed to update company tags' },
      { status: 500 }
    );
  }
}