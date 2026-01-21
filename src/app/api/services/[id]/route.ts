import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const {
      unique_service_code,
      service_name,
      service_names,
      service_categories,
      service_type,
      service_tat,
      service_fee,
      professional_fee,
      discount,
      challan_associated,
      gst_amount,
      total_amount
    } = await request.json();

    // Validate required fields
    if (!unique_service_code || !service_name || !service_type || !service_tat) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if unique service code already exists for other services
    const { data: existingService } = await supabase
      .from('services')
      .select('id')
      .eq('unique_service_code', unique_service_code)
      .neq('id', id)
      .maybeSingle();

    if (existingService) {
      return NextResponse.json(
        { error: 'Unique service code already exists' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('services')
      .update({
        unique_service_code,
        service_name,
        service_names: service_names || [], // Pass as array for JSONB
        service_categories: service_categories || [], // Pass as array for JSONB
        service_type,
        service_tat,
        service_fee,
        professional_fee,
        discount: discount || 0,
        challan_associated: challan_associated || '',
        gst_amount,
        total_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Service updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
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
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Service deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}