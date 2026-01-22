import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function GET() {
  try {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (companiesError) throw companiesError;

    // Fetch tags for each company
    // Note: In a real Supabase app, you'd use a single query with joins, e.g.:
    // .select('*, tags:company_tag_assignments(contact_tags(name))')
    // But keeping logical structure similar to original for safety.
    const companiesWithTags = await Promise.all(
      (companies || []).map(async (company) => {
        try {
          const { data: tags, error: tagsError } = await supabase
            .from('contact_tags')
            .select('name, company_tag_assignments!inner(company_id)')
            .eq('company_tag_assignments.company_id', company.id)
            .eq('type', 'company_tag')
            .order('name');

          if (tagsError) {
            // If table doesn't exist or other error, return empty tags
            return { ...company, tags: [] };
          }

          return {
            ...company,
            tags: tags.map((t: any) => t.name)
          };
        } catch (tagError) {
          return {
            ...company,
            tags: []
          };
        }
      })
    );

    return NextResponse.json(companiesWithTags);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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
    } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Deduplication Logic
    const duplicates = [];
    if (email) {
      const { data: dupEmail } = await supabase.from('companies').select('id').eq('email', email).single();
      if (dupEmail) duplicates.push(`Email (${email})`);
    }
    if (phone) {
      const { data: dupPhone } = await supabase.from('companies').select('id').eq('phone', phone).single();
      if (dupPhone) duplicates.push(`Phone (${phone})`);
    }
    // Also checking Registration Number if provided as it is unique
    if (registration_number) {
      const { data: dupReg } = await supabase.from('companies').select('id').eq('registration_number', registration_number).single();
      if (dupReg) duplicates.push(`Registration Number (${registration_number})`);
    }

    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: `Duplicate detected: Company with same ${duplicates.join(', ')} already exists.` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([
        {
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
          display_id: generateId()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id, display_id: data.display_id }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create company' },
      { status: 400 }
    );
  }
}