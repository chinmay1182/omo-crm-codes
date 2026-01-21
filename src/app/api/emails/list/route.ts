import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSession } from '@/app/lib/session';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

        const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                    }
                }
            }
        });
        const { searchParams } = new URL(request.url);

        const folder = searchParams.get('folder') || 'inbox';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Optional: Filter by user's assigned email if needed, or return all for now depending on policy
        // Currently returning all emails for the folder

        // Verify Authentication (Supports both Agent and User sessions)
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = String(session.user.id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        if (!supabaseAdmin) {
            // Log error but don't leak details if sensitive
            console.error('Server misconfiguration: supabaseAdmin missing in emails list');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        let query = supabaseAdmin
            .from('emails')
            .select('*, thread_count', { count: 'exact' })
            .eq('folder', folder)
            .order('date', { ascending: false })
            .range(offset, offset + limit - 1);

        if (isUUID) {
            query = query.eq('owner_id', userId);
        } else {
            // For Agents, fetch emails that have owner_id as NULL
            // (This matches how we save them in fetch-imap for agents)
            query = query.is('owner_id', null);
        }

        const { data: emails, error, count } = await query;

        if (error) {
            console.error('Error fetching emails from DB:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formattedEmails = (emails || []).map((email: any) => ({
            ...email,
            messageId: email.message_id, // Map DB snake_case to frontend camelCase
            inReplyTo: email.in_reply_to,
            references: email.email_references ? email.email_references.split(' ') : [],
        }));

        return NextResponse.json({
            emails: formattedEmails,
            count: count || 0
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
