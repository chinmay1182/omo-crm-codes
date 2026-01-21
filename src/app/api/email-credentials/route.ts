import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from '@/app/lib/session';

// GET - Fetch user's email credentials
export async function GET(request: Request) {
    try {
        const session = await getSessionFromRequest(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('email_credentials')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }

        return NextResponse.json(data || null);
    } catch (error: any) {
        console.error('Error fetching email credentials:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Save/Update user's email credentials
export async function POST(request: Request) {
    try {
        const session = await getSessionFromRequest(request);

        if (!session?.user?.id) {
            console.error('POST /api/email-credentials - No user ID in session');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        const body = await request.json();
        const { email, password, imapHost, imapPort, smtpHost, smtpPort } = body;


        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Check if credentials already exist
        const { data: existing } = await supabase
            .from('email_credentials')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('email', email)
            .single();


        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('email_credentials')
                .update({
                    password,
                    imap_host: imapHost || 'imap.hostinger.com',
                    imap_port: imapPort || 993,
                    smtp_host: smtpHost || 'smtp.hostinger.com',
                    smtp_port: smtpPort || 465,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                console.error('POST /api/email-credentials - Update error:', error);
                throw error;
            }
            return NextResponse.json({ success: true, data });
        } else {
            // Insert new
            const insertData = {
                user_id: session.user.id,
                email,
                password,
                imap_host: imapHost || 'imap.hostinger.com',
                imap_port: imapPort || 993,
                smtp_host: smtpHost || 'smtp.hostinger.com',
                smtp_port: smtpPort || 465
            };


            const { data, error } = await supabase
                .from('email_credentials')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('POST /api/email-credentials - Insert error:', error);
                throw error;
            }
            return NextResponse.json({ success: true, data });
        }
    } catch (error: any) {
        console.error('POST /api/email-credentials - Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove user's email credentials
export async function DELETE(request: Request) {
    try {
        const session = await getSessionFromRequest(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('email_credentials')
            .delete()
            .eq('user_id', session.user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting email credentials:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
