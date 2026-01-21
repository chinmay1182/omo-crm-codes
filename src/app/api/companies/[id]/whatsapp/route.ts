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

        // Fetch WhatsApp messages related to this company
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching company WhatsApp messages:', error);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        // Transform to match the expected format
        const formattedMessages = (messages || []).map((msg: any) => ({
            id: msg.message_id,
            direction: msg.direction === 'IN' ? 'inbound' : 'outbound',
            message: msg.content,
            timestamp: msg.created_at,
            status: msg.status || 'sent',
            media_url: msg.media_url,
            media_type: msg.media_type,
            media_filename: msg.media_filename,
            media_caption: msg.media_caption
        }));

        return NextResponse.json(formattedMessages);
    } catch (error: any) {
        console.error('Error in company WhatsApp messages API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
