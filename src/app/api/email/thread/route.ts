import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { getSession } from '@/app/lib/session';

export async function POST(req: NextRequest) {
    try {
        const { subject, messageId, references, folder } = await req.json();

        // 1. Authenticate (Supports both Agent and User sessions)
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = String(session.user.id);

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        // 2. Fetch Credentials
        const { data: credentials, error: credError } = await supabaseAdmin
            .from('workspace_emails')
            .select('email, app_password')
            .eq('assigned_agent_id', userId)
            .single();

        if (credError || !credentials) {
            return NextResponse.json({ error: 'No email configuration found' }, { status: 403 });
        }

        const email = credentials.email;
        const password = credentials.app_password;

        if (!subject) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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

        // Clean subject for searching: Remove Re:, Fwd:, etc.
        const cleanSubject = subject.replace(/^(re|fwd|fw):\s*/i, '').trim();
        const searchCriteria = [['HEADER', 'SUBJECT', cleanSubject]];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false,
        };

        const results: any[] = [];

        // Helper to fetch from a box
        const fetchFromBox = async (boxName: string) => {
            try {
                await connection.openBox(boxName);
                const messages = await connection.search(searchCriteria, fetchOptions);

                for (const item of messages) {
                    const all = item.parts.find((p: any) => p.which === '');
                    if (!all) continue;

                    const id = item.attributes.uid;
                    const parsed = await simpleParser(all.body);

                    // Parse attachments
                    const attachments = parsed.attachments?.map(att => ({
                        filename: att.filename || 'unnamed',
                        size: att.size || 0,
                        contentType: att.contentType || 'application/octet-stream'
                    })) || [];

                    results.push({
                        id: `${boxName}-${id}`,
                        from: parsed.from?.text || '',
                        to: (parsed.to as any)?.text || '',
                        cc: (parsed.cc as any)?.text || '',
                        subject: parsed.subject,
                        date: parsed.date ? parsed.date.toISOString() : '',
                        snippet: parsed.text ? parsed.text.substring(0, 100) : '',
                        body: parsed.html || parsed.textAsHtml || parsed.text,
                        messageId: parsed.messageId,
                        references: parsed.references, // Array or string
                        inReplyTo: parsed.inReplyTo,
                        folder: boxName,
                        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
                        has_attachments: attachments.length > 0
                    });
                }
            } catch (e) {
                console.warn(`Error searching ${boxName}`, e);
            }
        };

        // Search INBOX
        await fetchFromBox('INBOX');

        // Search Current Folder if different from INBOX
        if (folder && folder.toUpperCase() !== 'INBOX') {
            const isSent = folder.toLowerCase().includes('sent');
            if (!isSent) {
                await fetchFromBox(folder);
            }
        }




        // Search Sent - Optimize by checking available boxes first
        try {
            const boxes = await connection.getBoxes();

            // Helper recursive function to find Sent box
            const findSentBox = (boxList: any, prefix = ''): string | null => {
                for (const key of Object.keys(boxList)) {
                    const box = boxList[key];
                    const fullPath = prefix ? `${prefix}${box.delimiter}${key}` : key;

                    // Check attributes for \Sent
                    if (box.attribs && box.attribs.some((attr: string) => attr.toUpperCase() === '\\SENT')) {
                        return fullPath;
                    }

                    // Check children
                    if (box.children) {
                        const found = findSentBox(box.children, fullPath);
                        if (found) return found;
                    }
                }
                return null;
            };

            const sentBox = findSentBox(boxes);

            if (sentBox) {
                await fetchFromBox(sentBox);
            } else {
                // Fallback to common names if no attribute found
                const commonSent = ['[Gmail]/Sent Mail', 'Sent', 'Sent Items'];
                // Check if any of these exist in the box list keys (simplified check)
                // But since we have the full list, strict matching is safer.
                // For now, just try [Gmail]/Sent Mail as it's most common for this user base, 
                // and maybe 'Sent' if top level.

                // Construct flattened list of paths to check against common names
                const getPaths = (boxList: any, prefix = ''): string[] => {
                    let paths: string[] = [];
                    for (const key of Object.keys(boxList)) {
                        const fullPath = prefix ? `${prefix}${boxList[key].delimiter}${key}` : key;
                        paths.push(fullPath);
                        if (boxList[key].children) {
                            paths = paths.concat(getPaths(boxList[key].children, fullPath));
                        }
                    }
                    return paths;
                };

                const allPaths = getPaths(boxes);
                const target = commonSent.find(name => allPaths.includes(name));

                if (target) {
                    await fetchFromBox(target);
                }
            }

        } catch (e) {
            console.error('Error finding/searching Sent box:', e);
            // Fallback for safety if getBoxes fails
            await fetchFromBox('[Gmail]/Sent Mail');
        }

        await connection.end();

        // FILTERING logic
        let finalResults = results;

        if (messageId) {
            // Normalize references to array of strings
            let targetRefs = Array.isArray(references) ? references : (typeof references === 'string' ? [references] : []);
            const targetId = messageId;

            // Attempt to find the target email in the fetched results to get better references (since DB might be empty)
            const propertiesFromFetch = results.find(m => m.messageId === targetId);
            if (propertiesFromFetch) {
                const fetchedRefs = Array.isArray(propertiesFromFetch.references) ? propertiesFromFetch.references : (typeof propertiesFromFetch.references === 'string' ? [propertiesFromFetch.references] : []);
                // Merge refs, prefer fetched ones if request refs are empty
                const merged = new Set([...targetRefs, ...fetchedRefs]);
                if (propertiesFromFetch.inReplyTo) merged.add(propertiesFromFetch.inReplyTo);
                targetRefs = Array.from(merged).filter(Boolean);
            }

            finalResults = results.filter(msg => {
                const msgId = msg.messageId;
                const msgRefs = Array.isArray(msg.references)
                    ? msg.references
                    : (typeof msg.references === 'string' ? [msg.references] : []);

                if (msg.inReplyTo) msgRefs.push(msg.inReplyTo);

                // 1. Is it the target email itself?
                if (msgId === targetId) return true;

                // 2. Is it a child/descendant? (Does its refs contain targetId?)
                if (msgId && msgRefs.includes(targetId)) return true;

                // 3. Is it an ancestor? (Does targetRefs contain its msgId?)
                if (msgId && targetRefs.includes(msgId)) return true;

                // 4. Is it a sibling? (Do they share a common root/ref?)
                // Intersection of msgRefs and targetRefs
                const hasCommonRef = msgRefs.some((r: string) => targetRefs.includes(r));
                if (hasCommonRef && msgRefs.length > 0 && targetRefs.length > 0) return true;

                // STRICT: If messageId was provided, and we found NO link, we EXCLUDE it.
                // This prevents showing unrelated emails with similar subjects
                return false;
            });

            // Ensure at least the clicked email is shown if it was fetched
            if (finalResults.length === 0) {
                // IMAP search returned nothing - fetch from database as fallback
                console.warn("Thread fetch from IMAP returned empty, fetching from database");

                try {
                    const { data: dbEmail, error: dbError } = await supabaseAdmin
                        .from('emails')
                        .select('*')
                        .eq('message_id', messageId)
                        .single();

                    if (!dbError && dbEmail) {
                        finalResults = [{
                            id: dbEmail.id,
                            from: dbEmail.from,
                            to: dbEmail.to,
                            cc: dbEmail.cc,
                            subject: dbEmail.subject,
                            date: dbEmail.date,
                            snippet: dbEmail.snippet,
                            body: dbEmail.body,
                            messageId: dbEmail.message_id,
                            references: dbEmail.email_references ? dbEmail.email_references.split(' ') : [],
                            inReplyTo: dbEmail.in_reply_to,
                            folder: dbEmail.folder,
                            attachments: dbEmail.attachments,
                            has_attachments: dbEmail.has_attachments
                        }];
                    }
                } catch (dbErr) {
                    console.error("Failed to fetch email from database:", dbErr);
                }
            }
        } else {
            // If no messageId provided, only return emails that match the subject exactly
            // This prevents showing unrelated emails
            console.warn("No messageId provided for threading, returning subject matches only");

            const cleanSubject = subject.replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
            finalResults = results.filter(msg => {
                const msgSubject = (msg.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
                return msgSubject === cleanSubject;
            });

            // If still no results, return all results (fallback to old behavior)
            if (finalResults.length === 0) {
                finalResults = results;
            }
        }

        // Sort by date
        finalResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json(finalResults);

    } catch (error: any) {
        console.error('Fetch Thread Error:', error);
        return NextResponse.json(
            { error: `Fetch Thread Error: ${error.message}` },
            { status: 500 }
        );
    }
}
