import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import Imap from 'imap-simple';
// @ts-ignore
import MailComposer from 'nodemailer/lib/mail-composer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSession } from '@/app/lib/session';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const cookieStore = await cookies();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

        const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        });

        // 1. Authenticate (Supports both Agent and User sessions)
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = String(session.user.id);

        // 2. Fetch Credentials
        const { data: credentials, error: credError } = await supabase
            .from('workspace_emails')
            .select('email, app_password')
            .eq('assigned_agent_id', userId)
            .single();

        if (credError || !credentials) {
            return NextResponse.json(
                { error: 'No email configuration found for this account. Please go to Email Setup.' },
                { status: 403 }
            );
        }

        const email = credentials.email;
        const password = credentials.app_password;

        // 3. Extract Form Data
        const to = formData.get('to') as string;
        const cc = formData.get('cc') as string;
        const bcc = formData.get('bcc') as string;
        const subject = formData.get('subject') as string;
        const body = formData.get('body') as string;
        const inReplyTo = formData.get('inReplyTo') as string;
        const referencesRaw = formData.get('references') as string;
        const references = referencesRaw ? JSON.parse(referencesRaw) : undefined;

        // Process attachments
        const attachments: any[] = [];
        const files = formData.getAll('attachments') as File[];

        for (const file of files) {
            if (file && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                attachments.push({
                    filename: file.name,
                    content: buffer,
                    contentType: file.type
                });
            }
        }

        if (!to || !body) {
            return NextResponse.json({ error: 'Missing required fields: to and body are required' }, { status: 400 });
        }

        if (!subject || subject.trim() === '') {
            return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
        }

        // 4. Configure Transporter (Gmail)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: email,
                pass: password,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions: any = {
            from: email,
            to,
            cc,
            bcc,
            subject,
            html: body,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        // Add headers for threading if this is a reply
        if (inReplyTo) {
            mailOptions.inReplyTo = inReplyTo;
            mailOptions.references = references ? [...references, inReplyTo] : [inReplyTo];
            mailOptions.headers = {
                'In-Reply-To': inReplyTo,
                'References': Array.isArray(mailOptions.references) ? mailOptions.references.join(' ') : mailOptions.references
            };
        }

        const info = await transporter.sendMail(mailOptions);

        // Note: Gmail automatically saves sent emails to [Gmail]/Sent Mail
        // No need to manually append - doing so creates duplicates

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error('Send Email Error:', error);
        return NextResponse.json(
            { error: `Send Error: ${error.message}` },
            { status: 500 }
        );
    }
}
