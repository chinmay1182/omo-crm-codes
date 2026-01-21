import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const { data: locations, error } = await supabase
      .from('contact_locations')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching contact locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const {
      contactId,
      name,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      notes
    } = await req.json();

    if (!contactId || !name || !address) {
      return NextResponse.json(
        { error: 'Contact ID, name, and address are required' },
        { status: 400 }
      );
    }

    const { data: location, error: locationError } = await supabase
      .from('contact_locations')
      .insert({
        contact_id: contactId,
        name,
        address,
        city: city || null,
        state: state || null,
        country: country || null,
        postal_code: postal_code || null,
        latitude: latitude || null,
        longitude: longitude || null,
        notes: notes || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (locationError) throw locationError;

    // to view this in the feed, we could insert a system note, but for now we skip manual logging
    // to avoid VIEW insert errors.


    return NextResponse.json({
      success: true,
      id: location.id
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact location:', error);
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}