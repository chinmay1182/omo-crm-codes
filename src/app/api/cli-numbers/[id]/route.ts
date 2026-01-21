import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const {
      number,
      display_name,
      is_default = false,
      type = 'both',
      aparty = null,
      auth_username = null,
      auth_password = null
    } = await request.json();

    // Validate required fields
    if (!number || !display_name) {
      return NextResponse.json(
        { error: 'Number and display name are required' },
        { status: 400 }
      );
    }

    // If this is set as default, remove default from others of the same type
    if (is_default) {
      await supabase
        .from('cli_numbers')
        .update({ is_default: false })
        .or(`type.eq.${type},type.eq.both`);
    }

    const { error } = await supabase
      .from('cli_numbers')
      .update({
        number,
        aparty: aparty || null,
        display_name,
        is_default,
        type,
        auth_username: auth_username || null,
        auth_password: auth_password || null
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'CLI number updated successfully' });
  } catch (error: any) {
    console.error('Error updating CLI number:', error);
    return NextResponse.json(
      { error: 'Failed to update CLI number' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { error } = await supabase
      .from('cli_numbers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'CLI number deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting CLI number:', error);
    return NextResponse.json(
      { error: 'Failed to delete CLI number' },
      { status: 500 }
    );
  }
}