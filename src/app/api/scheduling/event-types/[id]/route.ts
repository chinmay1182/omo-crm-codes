
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/app/lib/session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const body = await req.json();

        // Allowed fields to update
        const { title, duration, description, slug, header_text } = body;

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (duration !== undefined) updates.duration = duration;
        if (description !== undefined) updates.description = description;
        if (slug !== undefined) updates.slug = slug;
        if (header_text !== undefined) updates.header_text = header_text;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('event_types')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating event type:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;

        // First, delete all associated bookings
        const { error: bookingsError } = await supabaseAdmin
            .from('bookings')
            .delete()
            .eq('event_type_id', id);

        if (bookingsError) {
            console.error('Error deleting associated bookings:', bookingsError);
            throw new Error('Failed to delete associated bookings');
        }

        // Then delete the event type
        const { error } = await supabaseAdmin
            .from('event_types')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting event type:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
