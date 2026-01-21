
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const slug = searchParams.get('slug');

    if (!userId || !slug) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Since we don't have username mapping yet in a simple table, assuming userId is UUID.
    // However, if we passed 'username', we'd need a lookup.
    // The previous page used User ID URL for simplicity.

    // We search for the event type
    let query = supabase.from('event_types').select('*');

    // Check if userId is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    if (isUuid) {
        query = query.eq('user_id', userId);
    } else {
        // Assume it's an Agent ID (integer)
        query = query.eq('agent_id', userId);
    }

    const { data, error } = await query.eq('slug', slug).single();

    if (error) {
        return NextResponse.json({ error: 'Event Type not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}
