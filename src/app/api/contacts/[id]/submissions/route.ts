
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

        // 2. Fetch Recent Submissions (Limit 200 for performance)
        const { data: submissions, error: subError } = await supabase
            .from('form_submissions')
            .select(`
                *,
                forms (
                    name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(200);

        if (subError) throw subError;

        // 3. Filter Matches
        const contactEmail = contactData.email?.toLowerCase();
        const contactPhone = contactData.phone?.replace(/\D/g, ''); // Digits only
        const contactMobile = contactData.mobile?.replace(/\D/g, '');

        const matchedSubmissions = submissions.filter(sub => {
            const contentStr = JSON.stringify(sub.content).toLowerCase();

            // Match Email
            if (contactEmail && contentStr.includes(contactEmail)) return true;

            // Match Phone/Mobile (Strict checks inside content values ideally, but loose check for now)
            // We check if the DIGITS of the phone exist in the stringified content
            // Assuming content might have phone: "123-456"
            // Simple string include might match partials, but it's better than nothing.

            if (contactPhone && contentStr.replace(/\D/g, '').includes(contactPhone)) return true;
            if (contactMobile && contentStr.replace(/\D/g, '').includes(contactMobile)) return true;

            return false;
        });

        return NextResponse.json(matchedSubmissions);
    } catch (error: any) {
        console.error("Error matching submissions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
