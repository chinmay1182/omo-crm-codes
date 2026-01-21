import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const { data: results, error, count } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: results || [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { referenceId, cli, aParty, bParty, status } = await req.json();

    if (!referenceId || !cli || !aParty || !bParty || !status) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    // Upsert call log based on reference_id
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
