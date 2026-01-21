
import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { supabase } from '@/app/lib/supabase';

// GET /api/leads/[id]/comments
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    try {
        const { data: comments, error } = await supabase
            .from('lead_comments')
            .select('*')
            .eq('lead_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(comments);
    } catch (error: any) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/leads/[id]/comments
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const session = await getSession(); // Optional: if you want to track who made the comment

    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('lead_comments')
            .insert([
                {
                    lead_id: id,
                    content,
                    // user_id: session?.user?.id // Uncomment if/when you want to track users
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error adding comment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
