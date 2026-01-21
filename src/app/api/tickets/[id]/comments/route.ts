
import { NextResponse } from 'next/server';
import { getSessionOrAgent } from '@/app/lib/auth-helper';
import { supabaseAdmin, hasAdminClient } from '@/app/lib/supabase-admin';
import { supabase } from '@/app/lib/supabase';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const session = await getSessionOrAgent(request);

    // Get creator ID from session or body
    let creatorId = session?.user?.id || body.created_by;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (creatorId && !uuidRegex.test(creatorId)) {
        creatorId = null;
    }

    // Use admin client if available to bypass RLS, otherwise fall back to regular client
    const client = hasAdminClient() ? supabaseAdmin! : supabase;

    const { data, error } = await client
        .from('ticket_comments')
        .insert([
            {
                ticket_id: id,
                content: body.content,
                created_by: creatorId,
                is_internal: body.is_internal || false
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Error inserting ticket comment:', error);
        return NextResponse.json({
            error: error.message,
            hint: !hasAdminClient() ? 'Consider adding SUPABASE_SERVICE_ROLE_KEY to .env.local to bypass RLS' : undefined
        }, { status: 500 });
    }

    return NextResponse.json(data);
}
