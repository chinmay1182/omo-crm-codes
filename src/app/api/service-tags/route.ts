import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const { data: tags, error } = await supabase
      .from('service_tags')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') return NextResponse.json([]);
      throw error;
    }

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching service tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, type } = await request.json();

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['service_name', 'service_category'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be service_name or service_category' },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const { data: existingTag } = await supabase
      .from('service_tags')
      .select('id')
      .eq('name', name)
      .eq('type', type)
      .single();

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      );
    }

    const tagId = uuidv4();

    const { error: insertError } = await supabase
      .from('service_tags')
      .insert([{
        id: tagId,
        name,
        type
      }]);

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'Service tag created successfully', tagId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating service tag:', error);
    return NextResponse.json(
      { error: 'Failed to create service tag' },
      { status: 500 }
    );
  }
}