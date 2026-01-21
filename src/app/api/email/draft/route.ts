
import { NextRequest, NextResponse } from 'next/server';
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
            return NextResponse.json({ error: 'No email configuration found' }, { status: 403 });
        }

        const email = credentials.email;
        const password = credentials.app_password;

        const to = formData.get('to') as string;
        const cc = formData.get('cc') as string;
        const bcc = formData.get('bcc') as string;
        const subject = formData.get('subject') as string;
        const body = formData.get('body') as string;
        const inReplyTo = formData.get('inReplyTo') as string;

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

        // 1. Build MIME Message
        const mailOptions: any = {
            from: email,
            to,
            cc,
            bcc,
            subject,
            html: body,
            attachments: attachments.length > 0 ? attachments : undefined,
            date: new Date() // Important for Drafts
        };

        if (inReplyTo) {
            mailOptions.inReplyTo = inReplyTo;
        }

        const composer = new MailComposer(mailOptions);
        const messageBuffer = await composer.compile().build();

        // 2. Connect to IMAP
        const connection = await Imap.connect({
            imap: {
                user: email,
                password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                authTimeout: 15000,
                tlsOptions: { rejectUnauthorized: false }
            }
        });

        const boxes = await connection.getBoxes();
        const boxNameList = Object.keys(boxes);

        // Find "Drafts" folder - Gmail standard is [Gmail]/Drafts
        let draftsFolder = boxNameList.find(name => /drafts/i.test(name));

        if (!draftsFolder && boxes['[Gmail]'] && boxes['[Gmail]'].children) {
            const gmailChildren = Object.keys(boxes['[Gmail]'].children);
            const gmailDrafts = gmailChildren.find(name => /drafts/i.test(name));
            if (gmailDrafts) {
                draftsFolder = '[Gmail]' + (boxes['[Gmail]'].delimiter || '/') + gmailDrafts;
            }
        }

        if (!draftsFolder) draftsFolder = '[Gmail]/Drafts';

        // 3. Append to Drafts
        await connection.append(messageBuffer, {
            mailbox: draftsFolder,
            flags: ['\\Draft', '\\Seen'] // Often drafts are seen by default if created by user
        });

        await connection.end();

        return NextResponse.json({ success: true, folder: draftsFolder });

    } catch (error: any) {
        console.error('Save Draft Error:', error);
        return NextResponse.json(
            { error: `Save Draft Error: ${error.message}` },
            { status: 500 }
        );
    }
}
