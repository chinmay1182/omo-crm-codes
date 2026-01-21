import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
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
    const body = await request.json();
    const {
      name,
      type,
      registration_number,
      incorporation_date,
      phone,
      email,
      website,
      description,
      address,
      city,
      state,
      country,
      postal_code
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Update company
    const { error } = await supabase
      .from('companies')
      .update({
        name,
        type: type || null,
        registration_number: registration_number || null,
        incorporation_date: incorporation_date || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        description: description || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        postal_code: postal_code || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      // Check if not found based on error or row count? Supabase update error usually implies DB error.
      // If we want 404, we can do a select first or rely on client side handling.
      // But `update` usually doesn't return error if 0 rows matched. 
      // Let's assume successful if no error, but we can verify ID existence if strictly required.
      // For now, mirroring standard migration pattern.
      throw error;
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update company' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if company exists
    const { data: existingCompany } = await supabase.from('companies').select('id').eq('id', id).maybeSingle();

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // First check if there are any contacts associated with this company
    const { count, error: countError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete company with associated contacts',
          contactCount: count
        },
        { status: 400 }
      );
    }

    // Delete the company
    const { error: deleteError } = await supabase.from('companies').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete company' },
      { status: 400 }
    );
  }
}