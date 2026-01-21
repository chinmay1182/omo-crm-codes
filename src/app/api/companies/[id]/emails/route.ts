import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: companyId } = await params;

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        // 1. Fetch company details to get the email address
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('email')
            .eq('id', companyId)
            .single();

        let query = supabase
            .from('emails')
            .select('*')
            .order('date', { ascending: false });

        if (company?.email) {
            // If company has email, match by ID OR email content
            // Note: Use raw string for or() to handle complex conditions
            query = query.or(`company_id.eq.${companyId},from.ilike.%${company.email}%,to.ilike.%${company.email}%`);
        } else {
            // Fallback to just ID
            query = query.eq('company_id', companyId);
        }

        const { data: emails, error } = await query;

        if (error) {
            console.error('Error fetching company emails:', error);
            return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
        }

        // Transform to match the expected format
        const formattedEmails = (emails || []).map((email: any) => ({
            id: email.id,
            from: email.from,
            to: email.to,
            subject: email.subject,
            date: email.date,
            snippet: email.snippet || email.body?.substring(0, 150) || '',
            type: email.folder === 'sent' ? 'sent' : 'received',
            has_attachments: email.has_attachments || false,
            is_read: email.is_read || false
        }));

        return NextResponse.json(formattedEmails);
    } catch (error: any) {
        console.error('Error in company emails API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
