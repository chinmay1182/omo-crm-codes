import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { referenceId, cli, aParty, bParty, status } = await req.json();

    if (!referenceId || !cli || !aParty || !bParty || !status) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    const { error } = await supabase
      .from('call_logs')
      .upsert(
        {
          reference_id: referenceId,
          cli,
          a_party: aParty,
          b_party: bParty,
          status,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'reference_id' }
      );

    if (error) throw error;

    return NextResponse.json({ message: 'Call log saved/updated' });
  } catch (error) {
    console.error('Failed to save call log:', error);
    return NextResponse.json({ error: 'Failed to save call log' }, { status: 500 });
  }
}
