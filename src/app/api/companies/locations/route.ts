import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ locations: [] });
    }

    const { data: locations, error } = await supabase
      .from('company_locations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      // Warning log but safe return if table missing during dev
      console.warn('Company locations fetch error:', error.message);
      return NextResponse.json({ locations: [] });
    }

    return NextResponse.json({ locations: locations || [] });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const {
      companyId,
      name,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude
    } = await request.json();

    if (!companyId || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('company_locations')
      .insert([
        {
          company_id: companyId,
          name: name || 'Primary',
          address,
          city,
          state: state || null,
          country,
          postal_code: postal_code || null,
          latitude: latitude || null,
          longitude: longitude || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: 'Location created successfully', locationId: data.id, location: data }, { status: 201 });
  } catch (error) {
    console.error('Error adding location:', error);
    return NextResponse.json({ error: 'Failed to add location' }, { status: 500 });
  }
}