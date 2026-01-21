import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Contact tag deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting contact tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact tag' },
      { status: 500 }
    );
  }
}