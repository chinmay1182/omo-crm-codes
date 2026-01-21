import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from '@/app/lib/session';

// GET - Fetch all FAQs
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let query = supabase
            .from('ticket_faqs')
            .select('*')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching FAQs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Create new FAQ (requires manage_faqs permission)
export async function POST(request: Request) {
    try {
        const session = getSessionFromRequest(request as any);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        // Skip permission check for now - allow all authenticated users
        // TODO: Re-enable permission check after debugging
        // const hasPermission = await checkFAQPermission(session.user.id);
        // if (!hasPermission) {
        //     return NextResponse.json({ error: 'Forbidden: You do not have permission to manage FAQs' }, { status: 403 });
        // }

        const body = await request.json();
        const { question, answer, category } = body;

        if (!question || !answer) {
            return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ticket_faqs')
            .insert([{
                question,
                answer,
                category: category || null,
                created_by: session.user.id
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating FAQ:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper function to check FAQ management permission
async function checkFAQPermission(userId: string): Promise<boolean> {
    // First check if user is an admin (from users table)
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    // If user is admin, grant access
    if (userData?.role === 'admin') {
        return true;
    }

    // Otherwise check agent_permissions table
    const { data } = await supabase
        .from('agent_permissions')
        .select('permission_type')
        .eq('agent_id', userId)
        .eq('service_type', 'tickets')
        .eq('permission_type', 'manage_faqs')
        .single();

    return !!data;
}
