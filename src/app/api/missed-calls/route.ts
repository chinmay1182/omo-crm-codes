import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// Note: VoIP provider doesn't have call history APIs
// We rely on webhooks only for missed call detection

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cliNumber = searchParams.get('cli') || '8810878185';
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }


    // Calculate 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get from database (populated by webhooks)
    const { data: dbCalls, error } = await supabase
      .from('missed_calls')
      .select('*')
      .eq('callee_number', cliNumber)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') return NextResponse.json({
        success: true,
        source: 'database',
        missedCalls: [],
        count: 0,
        timestamp: new Date().toISOString(),
        message: 'Missed calls table not ready yet'
      });
      throw error;
    }


    return NextResponse.json({
      success: true,
      source: 'database',
      missedCalls: dbCalls || [],
      count: (dbCalls || []).length,
      timestamp: new Date().toISOString(),
      message: 'Missed calls are detected via webhooks and stored in database'
    });

  } catch (error: any) {
    console.error('❌ Error fetching missed calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch missed calls', details: error.message },
      { status: 500 }
    );
  }
}

// Store missed call manually
export async function POST(req: NextRequest) {
  try {
    const { call_id, caller_number, callee_number, call_time, status, missed_reason, call_source } = await req.json();

    if (!call_id || !caller_number || !callee_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('missed_calls')
      .upsert({
        call_id,
        caller_number,
        callee_number,
        call_time,
        status,
        missed_reason,
        call_source,
        updated_at: new Date().toISOString()
      }, { onConflict: 'call_id' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Missed call stored successfully'
    });

  } catch (error: any) {
    console.error('❌ Error storing missed call:', error);
    return NextResponse.json(
      { error: 'Failed to store missed call' },
      { status: 500 }
    );
  }
}
