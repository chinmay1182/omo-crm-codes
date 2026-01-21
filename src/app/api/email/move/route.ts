import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap-simple';
import { createServerClient } from '@supabase/ssr';
import { getSession } from '@/app/lib/session';
import { cookies } from 'next/headers';

// Helper to find folder by common names (reused logic)
const findTargetBox = (boxes: any, folderType: string): string | null => {
    // Standard mappings
    const searchTerms: Record<string, string[]> = {
        'sent': ['sent', 'sent items', 'sent mail'],
        'trash': ['trash', 'bin', 'deleted items', 'deleted'],
        'spam': ['spam', 'junk', 'bulk'],
        'drafts': ['drafts'],
        'inbox': ['inbox']
    };

    const terms = searchTerms[folderType.toLowerCase()] || [folderType.toLowerCase()];

    const findBoxPath = (boxList: any, prefix = ''): string | null => {
        for (const key in boxList) {
            const fullPath = prefix ? prefix + (boxList[key].delimiter || '/') + key : key;
            if (terms.some(t => key.toLowerCase().includes(t))) {
                return fullPath;
            }
            if (boxList[key].children) {
                const childMatch = findBoxPath(boxList[key].children, fullPath);
                if (childMatch) return childMatch;
            }
        }
        return null;
    };

    return findBoxPath(boxes);
};

export async function POST(req: NextRequest) {
    try {
        const { uid, targetFolder, sourceFolder } = await req.json();

        const cookieStore = await cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co'
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4'


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

        if (!uid || !targetFolder) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const config = {
            imap: {
                user: email,
                password,
                host: 'imap.gmail.com', // Enforcing Gmail as per rest of app
                port: 993,
                tls: true,
                authTimeout: 30000,
                tlsOptions: { rejectUnauthorized: false }
            },
        };

        const connection = await Imap.connect(config);

        // 1. Open Source Folder to find the message
        // We need to resolve source folder first if it's not the actual path
        // For simplicity, we assume sourceFolder passed from frontend is the generic ID (e.g. 'INBOX', 'Spam')
        // We need to resolve it to actual path to open it.
        const boxes = await connection.getBoxes();

        let actualSourceBox = findTargetBox(boxes, sourceFolder || 'INBOX') || 'INBOX';
        // If source was passed as exact path (rare), try that? 
        // Our fontend sends 'INBOX', 'Sent', 'Spam' etc.


        await connection.openBox(actualSourceBox);

        // 2. Resolve Target Folder
        let actualTargetBox = findTargetBox(boxes, targetFolder);

        if (!actualTargetBox) {
            // Fallback: if target is 'Trash' and not found, maybe just delete? 
            // But this is a generic move. If target not found, we can't move.
            // Exception: if target is INBOX, it is always INBOX.
            if (targetFolder.toUpperCase() === 'INBOX') actualTargetBox = 'INBOX';
            else {
                throw new Error(`Target folder '${targetFolder}' not found on server.`);
            }
        }

        // 3. Move
        await connection.moveMessage(uid, actualTargetBox);

        await connection.end();

        return NextResponse.json({ success: true, from: actualSourceBox, to: actualTargetBox });

    } catch (error: any) {
        console.error('IMAP Move Error:', error);
        return NextResponse.json(
            { error: `Move failed: ${error.message}` },
            { status: 500 }
        );
    }
}
