import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const {
      number,
      display_name,
      is_active,
      is_default,
      api_key,
      webhook_url,
      status
    } = await request.json();

    // If this is set as default, remove default from others
    if (is_default) {
      await supabase
        .from('whatsapp_numbers')
        .update({ is_default: false })
        .neq('id', id);
    }

    const { error } = await supabase
      .from('whatsapp_numbers')
      .update({
        number,
        display_name,
        is_active,
        is_default,
        api_key,
        webhook_url,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'WhatsApp number updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating WhatsApp number:', error);
    return NextResponse.json(
      { error: 'Failed to update WhatsApp number' },
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
      .from('whatsapp_numbers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'WhatsApp number deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting WhatsApp number:', error);
    return NextResponse.json(
      { error: 'Failed to delete WhatsApp number' },
      { status: 500 }
    );
  }
}