
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function getPlatformLogo(): Promise<string> {
    try {
        // Fetch the first agent who has a company logo set.
        // In a single-tenant system, this is likely the admin.
        // We order by created_at to get the "original" admin.

        // Note: supabaseAdmin bypasses RLS, so this works on server side (API routes, Email Utils)
        if (!supabaseAdmin) return '';

        const { data, error } = await supabaseAdmin
            .from('agents')
            .select('company_logo')
            .not('company_logo', 'is', null) // Filter for non-null logos
            .neq('company_logo', '') // Filter for non-empty strings
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (error || !data) {
            return '';
        }

        return data.company_logo || '';
    } catch (e) {
        console.error("Error fetching platform logo", e);
        return '';
    }
}

export async function getPlatformSeal(): Promise<string> {
    try {
        if (!supabaseAdmin) return '';

        const { data, error } = await supabaseAdmin
            .from('agents')
            .select('company_seal')
            .not('company_seal', 'is', null)
            .neq('company_seal', '')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (error || !data) {
            return '';
        }

        return data.company_seal || '';
    } catch (e) {
        console.error("Error fetching platform seal", e);
        return '';
    }
}
