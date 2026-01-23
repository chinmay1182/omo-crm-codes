import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { getSession } from '@/app/lib/session';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        // Allow update if logged in
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { agentId, companyLogo } = body;

        if (!agentId || !companyLogo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Use supabaseAdmin to bypass RLS, ensuring the update works
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { error } = await supabaseAdmin
            .from('agents')
            .update({ company_logo: companyLogo })
            .eq('id', agentId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating company logo:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
