import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: contactId } = await params;

        if (!contactId) {
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }

        // 1. Fetch contact details to get the email address
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('email')
            .eq('id', contactId)
            .single();

        let query = supabase
            .from('emails')
            .select('*')
            .order('date', { ascending: false });

        if (contact?.email) {
            // Match by ID OR email content
            query = query.or(`contact_id.eq.${contactId},from.ilike.%${contact.email}%,to.ilike.%${contact.email}%`);
        } else {
            // Fallback to just ID
            query = query.eq('contact_id', contactId);
        }

        const { data: emails, error } = await query;

        if (error) {
            console.error('Error fetching contact emails:', error);
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
        console.error('Error in contact emails API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
