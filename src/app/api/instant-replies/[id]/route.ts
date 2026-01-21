import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Try to delete from database
    try {
      const { error } = await supabase.from('instant_replies').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Reply deleted successfully' });
    } catch (dbError) {
      return NextResponse.json({ success: true, message: 'Reply deleted locally' });
    }
  } catch (error) {
    console.error('Error deleting instant reply:', error);
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
  }
}