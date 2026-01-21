
import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap-simple';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSession } from '@/app/lib/session';

export async function POST(req: NextRequest) {
    try {
        const { uid, folderName } = await req.json();

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

        if (!uid) {
            return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
        }

        const config = {
            imap: {
                user: email,
                password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                authTimeout: 15000,
                tlsOptions: { rejectUnauthorized: false }
            },
        };

        const connection = await Imap.connect(config);
        const boxToOpen = folderName || 'INBOX';
        await connection.openBox(boxToOpen);

        // For Gmail, we try to move to [Gmail]/Trash or [Gmail]/Bin
        const boxes = await connection.getBoxes();
        const boxNameList = Object.keys(boxes);

        // Sometimes nested under [Gmail]
        let trashFolder = boxNameList.find(name => /trash|bin/i.test(name));

        if (!trashFolder && boxes['[Gmail]'] && boxes['[Gmail]'].children) {
            const gmailChildren = Object.keys(boxes['[Gmail]'].children);
            const gmailTrash = gmailChildren.find(name => /trash|bin/i.test(name));
            if (gmailTrash) {
                trashFolder = '[Gmail]' + (boxes['[Gmail]'].delimiter || '/') + gmailTrash;
            }
        }

        // Fallback for standard Gmail
        if (!trashFolder) trashFolder = '[Gmail]/Trash';

        try {
            await connection.moveMessage(uid, trashFolder);
        } catch (moveError) {
            // If move fails, try flagging as deleted
            console.warn('Move to trash failed, flagging as deleted', moveError);
            await connection.addFlags(uid, '\\Deleted');
        }

        await connection.end();

        // Also delete from local database to keep in sync
        try {
            const { error: dbError } = await supabase
                .from('emails')
                .delete()
                .eq('id', uid);

            if (dbError) {
                console.error('Failed to delete from database:', dbError);
                // Non-critical - email is already deleted from Gmail
            }
        } catch (dbErr) {
            console.error('Database deletion error:', dbErr);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Email Error:', error);
        return NextResponse.json(
            { error: `Delete Error: ${error.message}` },
            { status: 500 }
        );
    }
}
