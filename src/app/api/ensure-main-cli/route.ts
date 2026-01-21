import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST() {
  try {
    // Check if the primary CLI number exists
    const { data: existingCli } = await supabase
      .from('cli_numbers')
      .select('id')
      .eq('number', '8881116071')
      .maybeSingle();

    if (!existingCli) {
      // Create the primary CLI number if it doesn't exist
      const { error } = await supabase
        .from('cli_numbers')
        .insert({
          id: 'cli-primary-8881116071',
          number: '8881116071',
          display_name: 'Primary CLI Line',
          type: 'both',
          is_default: true,
          is_active: true
        });

      if (error) throw error;

      return NextResponse.json({
        message: 'Primary CLI number created successfully',
        created: true
      });
    }

    return NextResponse.json({
      message: 'Primary CLI number already exists',
      created: false
    });
  } catch (error) {
    console.error('Error ensuring main CLI number:', error);
    return NextResponse.json(
      { error: 'Failed to ensure main CLI number exists' },
      { status: 500 }
    );
  }
}