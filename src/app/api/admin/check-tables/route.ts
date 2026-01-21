import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
    try {
        // Check contact_files table structure
        const { data: contactFilesColumns, error: contactError } = await supabase
            .from('contact_files')
            .select('*')
            .limit(1);

        // Check company_files table structure
        const { data: companyFilesColumns, error: companyError } = await supabase
            .from('company_files')
            .select('*')
            .limit(1);

        return NextResponse.json({
            contact_files: {
                exists: !contactError,
                error: contactError?.message,
                sample: contactFilesColumns
            },
            company_files: {
                exists: !companyError,
                error: companyError?.message,
                sample: companyFilesColumns
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
