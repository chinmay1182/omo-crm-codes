
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // 1. Fetch Contact Details (Email, Phone, Mobile)
        const { data: contactData, error: contactError } = await supabase
            .from('contacts')
            .select('email, phone, mobile')
            .eq('id', id)
            .single();

        if (contactError) throw contactError;

        // 2. Fetch submissions directly linked by contact_id column
        const { data: directSubmissions, error: directError } = await supabase
            .from('form_submissions')
            .select(`
                *,
                forms (
                    name
                )
            `)
            .eq('contact_id', id)
            .order('created_at', { ascending: false });

        if (directError) throw directError;

        // 3. Fetch Recent Submissions to fuzzy-match (for legacy/unlinked submissions)
        const { data: submissions, error: subError } = await supabase
            .from('form_submissions')
            .select(`
                *,
                forms (
                    name
                )
            `)
            .is('contact_id', null) // Only check unlinked ones for fuzzy match
            .order('created_at', { ascending: false })
            .limit(200);

        if (subError) throw subError;

        // 4. Fuzzy-match unlinked submissions by email/phone in content
        const contactEmail = contactData.email?.toLowerCase();
        const contactPhone = contactData.phone?.replace(/\D/g, '');
        const contactMobile = contactData.mobile?.replace(/\D/g, '');

        const fuzzyMatched = (submissions || []).filter(sub => {
            const contentObj = sub.content || {};

            // Match Explicit Contact ID (from URL parameter stored inside content)
            if (contentObj.contact_id && String(contentObj.contact_id) === String(id)) return true;

            const contentStr = JSON.stringify(sub.content).toLowerCase();

            // Match Email
            if (contactEmail && contentStr.includes(contactEmail)) return true;

            // Match Phone/Mobile
            if (contactPhone && contentStr.replace(/\D/g, '').includes(contactPhone)) return true;
            if (contactMobile && contentStr.replace(/\D/g, '').includes(contactMobile)) return true;

            return false;
        });

        // 5. Merge direct + fuzzy (deduplicate by id)
        const allIds = new Set((directSubmissions || []).map(s => s.id));
        const merged = [
            ...(directSubmissions || []),
            ...fuzzyMatched.filter(s => !allIds.has(s.id))
        ];

        return NextResponse.json(merged);
    } catch (error: any) {
        console.error("Error matching submissions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
