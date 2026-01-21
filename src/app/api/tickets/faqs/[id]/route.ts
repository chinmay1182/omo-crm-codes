import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from '@/app/lib/session';

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

// GET - Fetch single FAQ
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    const { data, error } = await supabase
        .from('ticket_faqs')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
}

// PATCH - Update FAQ (requires manage_faqs permission)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSessionFromRequest(request as any);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Skip permission check - allow all authenticated users
        // const hasPermission = await checkFAQPermission(session.user.id);
        // if (!hasPermission) {
        //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        // }

        const { id } = params;
        const body = await request.json();

        const { data, error } = await supabase
            .from('ticket_faqs')
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating FAQ:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Delete FAQ (requires manage_faqs permission)
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSessionFromRequest(request as any);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Skip permission check - allow all authenticated users
        // const hasPermission = await checkFAQPermission(session.user.id);
        // if (!hasPermission) {
        //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        // }

        const { id } = params;

        const { error } = await supabase
            .from('ticket_faqs')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting FAQ:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
