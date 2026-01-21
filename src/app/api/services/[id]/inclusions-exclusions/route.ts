import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: service, error } = await supabase
      .from('services')
      .select('inclusions, exclusions')
      .eq('id', id)
      .single();

    if (error || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Supabase returns parsed JSON for JSONB columns, so no need to parse manually if it's already an object/array
    // But sometimes it might be null.

    return NextResponse.json({
      inclusions: service.inclusions || [],
      exclusions: service.exclusions || []
    });
  } catch (error) {
    console.error('Error fetching inclusions/exclusions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inclusions and exclusions' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { inclusions, exclusions } = await request.json();

    // Validate input
    if (!Array.isArray(inclusions) || !Array.isArray(exclusions)) {
      return NextResponse.json(
        { error: 'Inclusions and exclusions must be arrays' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('services')
      .update({
        inclusions: inclusions, // Pass array directly for JSONB
        exclusions: exclusions, // Pass array directly for JSONB
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Inclusions and exclusions updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating inclusions/exclusions:', error);
    return NextResponse.json(
      { error: 'Failed to update inclusions and exclusions' },
      { status: 500 }
    );
  }
}