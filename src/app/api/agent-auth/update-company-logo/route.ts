
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSession } from '@/app/lib/session';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agentId, companyLogo } = await req.json();

        if (!agentId || !companyLogo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // In this app, users table has company_logo column. 
        // And user.id is typically what we update. 
        // Agent table might also be used depending on architecture, but layout uses user.company_name/logo.

        // Update 'users' table if user is an admin/owner type or update 'agents' table?
        // Based on DashboardLayout, user comes from useAuth context.

        // Let's try to update both to be safe or check user type.
        // Assuming 'agents' table for agents and 'users' table implies broader user scope.
        // The previous profile update used 'agents' table for profile_image. 
        // Let's assume company_logo is on the 'agents' table OR custom User metadata.

        // Wait, the detailed request says "realtime voh save hona chiaye database me".
        // We will update 'agents' table with 'company_logo' column.

        const { error } = await supabase
            .from('agents') // Using agents table as primary user table in this context
            .update({ company_logo: companyLogo })
            .eq('id', agentId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating company logo:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
