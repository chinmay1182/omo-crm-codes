import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

import { getSessionFromRequest } from "@/app/lib/session"; // Import getSessionFromRequest

export async function GET(req: NextRequest) { // Type Request appropriately
  try {
    const { searchParams } = new URL(req.url); // Parse search params
    const assignedOnly = searchParams.get('assigned_only') === 'true';

    let query = supabase
      .from('cli_numbers')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (assignedOnly) {
      const session = getSessionFromRequest(req);
      if (session?.user?.id) {
        // Fetch assigned CLI IDs for the current agent
        const { data: assignments, error: assignmentError } = await supabase
          .from('agent_cli_assignments')
          .select('cli_id')
          .eq('agent_id', session.user.id);

        if (!assignmentError && assignments) {
          const assignedIds = assignments.map((a: any) => a.cli_id);

          if (assignedIds.length > 0) {
            query = query.in('id', assignedIds);
          } else {
            // agent has no assignments, return empty
            return NextResponse.json([]);
          }
        }
      }
    }

    const { data: numbers, error } = await query;

    if (error) {
      // If table doesn't exist yet (PGRST204 or 42P01), return empty array
      if (error.code === '42P01' || error.code === 'PGRST204') {
        return NextResponse.json([]);
      }
      throw error;
    }

    return NextResponse.json(numbers);
  } catch (error: any) {
    console.error('Error fetching CLI numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CLI numbers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      number,
      display_name,
      is_default = false,
      type = 'both', // 'voip', 'whatsapp', or 'both'
      aparty = null,
      auth_username = null,
      auth_password = null
    } = await request.json();

    // Validate required fields
    if (!number || !display_name) {
      return NextResponse.json(
        { error: 'Number and display name are required' },
        { status: 400 }
      );
    }

    // Check if number already exists
    const { data: existingNumber } = await supabase
      .from('cli_numbers')
      .select('id')
      .eq('number', number)
      .single();

    if (existingNumber) {
      return NextResponse.json(
        { error: 'CLI number already exists' },
        { status: 400 }
      );
    }

    const numberId = uuidv4();

    // If this is set as default, remove default from others of the same type
    if (is_default) {
      await supabase
        .from('cli_numbers')
        .update({ is_default: false })
        .or(`type.eq.${type},type.eq.both`);
    }

    const { error: insertError } = await supabase
      .from('cli_numbers')
      .insert([
        {
          id: numberId,
          number,
          aparty: aparty || null,
          display_name,
          is_default,
          type,
          is_active: true,
          auth_username: auth_username || null,
          auth_password: auth_password || null
        }
      ]);

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'CLI number added successfully', numberId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating CLI number:', error);
    return NextResponse.json(
      { error: 'Failed to create CLI number' },
      { status: 500 }
    );
  }
}