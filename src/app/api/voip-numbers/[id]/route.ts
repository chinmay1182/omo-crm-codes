import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const {
      cli_number,
      display_name,
      provider,
      is_active,
      is_default,
      api_endpoint,
      api_key,
      api_secret,
      status
    } = await request.json();

    // If this is set as default, remove default from others
    if (is_default) {
      await supabase
        .from('voip_numbers')
        .update({ is_default: false })
        .neq('id', id);
    }

    const { error } = await supabase
      .from('voip_numbers')
      .update({
        cli_number,
        display_name,
        provider,
        is_active,
        is_default,
        api_endpoint,
        api_key,
        api_secret,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'VOIP number updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating VOIP number:', error);
    return NextResponse.json(
      { error: 'Failed to update VOIP number' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabase
      .from('voip_numbers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'VOIP number deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting VOIP number:', error);
    return NextResponse.json(
      { error: 'Failed to delete VOIP number' },
      { status: 500 }
    );
  }
}