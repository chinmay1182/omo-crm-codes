import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        if (!supabaseAdmin) {
            console.error('supabaseAdmin is null - missing Service Role Key');
            return NextResponse.json({ error: 'Service Role Key configuration missing' }, { status: 503 });
        }


        // Fetch users from auth.users (requires service role)
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            throw error;
        }

        // Map them to a friendly format
        const cleanUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
            created_at: u.created_at
        }));

        return NextResponse.json({ users: cleanUsers });
    } catch (error: any) {
        console.error('Error fetching admin users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
