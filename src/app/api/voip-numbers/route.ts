import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const { data: numbers, error } = await supabase
      .from('voip_numbers')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') {
        return NextResponse.json([]);
      }
      throw error;
    }

    return NextResponse.json(numbers);
  } catch (error) {
    console.error('Error fetching VOIP numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VOIP numbers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      cli_number,
      display_name,
      provider,
      is_active = true,
      is_default = false,
      api_endpoint,
      api_key,
      api_secret,
      webhook_url
    } = await request.json();

    // Validate required fields
    if (!cli_number || !display_name || !provider) {
      return NextResponse.json(
        { error: 'CLI number, display name, and provider are required' },
        { status: 400 }
      );
    }

    // Check if CLI number already exists
    const { data: existingNumber } = await supabase
      .from('voip_numbers')
      .select('id')
      .eq('cli_number', cli_number)
      .single();

    if (existingNumber) {
      return NextResponse.json(
        { error: 'VOIP CLI number already exists' },
        { status: 400 }
      );
    }

    const numberId = uuidv4();

    // If this is set as default, remove default from others
    if (is_default) {
      await supabase
        .from('voip_numbers')
        .update({ is_default: false })
        .neq('id', 'placeholder');
    }

    const { error: insertError } = await supabase
      .from('voip_numbers')
      .insert([{
        id: numberId,
        cli_number,
        display_name,
        provider,
        is_active,
        is_default,
        api_endpoint: api_endpoint || null,
        api_key: api_key || null,
        api_secret: api_secret || null,
        webhook_url: webhook_url || null
      }]);

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'VOIP number added successfully', numberId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating VOIP number:', error);
    return NextResponse.json(
      { error: 'Failed to create VOIP number' },
      { status: 500 }
    );
  }
}