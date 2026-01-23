import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');

        if (!agentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let agentId;
        try {
            const sessionData = JSON.parse(agentSession.value);
            const agent = sessionData.user || sessionData;
            const permissions = agent.permissions;
            agentId = agent.id;

            if (!permissions?.forms?.includes('enable_disable')) {
                return NextResponse.json({ error: 'Access Denied: Forms module disabled' }, { status: 403 });
            }
            if (!permissions?.forms?.includes('create')) {
                return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description } = body; // Ignore passed userId for security, use agentId

        const { data, error } = await supabase
            .from('forms')
            .insert([
                {
                    name,
                    description,
                    user_id: agentId, // Bind to authenticated agent
                    published: false,
                    content: '[]',
                    visits: 0,
                    submissions: 0
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // Create notification
        try {
            await supabase.from('notifications').insert([
                {
                    title: 'New Form Created',
                    message: `Form "${name}" has been created.`,
                    type: 'info',
                    related_id: data.id,
                    related_type: 'form'
                }
            ]);
        } catch (notifError) {
            console.error('Error creating notification for form:', notifError);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating form:', error);
        return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        // const userId = searchParams.get('userId'); // Deprecated public filter

        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');

        if (!agentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let agentId;
        let permissions;
        try {
            const sessionData = JSON.parse(agentSession.value);
            const agent = sessionData.user || sessionData;
            permissions = agent.permissions;
            agentId = agent.id;

            if (!permissions?.forms?.includes('enable_disable')) {
                return NextResponse.json({ error: 'Access Denied: Forms module disabled' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Logic: View my forms (assigned) or View All?
        // Usually forms are shared resources, but let's stick to simple ownership or view_all.
        // Assuming 'view_all' allows seeing everyone's forms, 'view_assigned' allows seeing own.

        let query = supabase.from('forms').select('*');

        if (!permissions?.forms?.includes('view_all')) {
            // Force filter by own ID
            query = query.eq('user_id', agentId);
        } else {
            // If view_all, optionally filter by userId param if provided, else show all
            const userIdParam = searchParams.get('userId');
            if (userIdParam) {
                query = query.eq('user_id', userIdParam);
            }
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching forms:', error);
        return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
    }
}
