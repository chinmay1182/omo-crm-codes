import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error: deleteError, count: deletedCount } = await supabase
      .from('service_tags')
      .delete({ count: 'exact' }) // Request count of deleted rows
      .eq('id', id);

    if (deleteError) throw deleteError;

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Service tag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Service tag deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete service tag' },
      { status: 500 }
    );
  }
}