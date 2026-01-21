import { NextResponse } from 'next/server';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { getSession } from '@/app/lib/session';

// Helper function to check if IMAP message structure contains attachments
function checkStructureForAttachments(struct: any): boolean {
    if (!struct) return false;

    // Check if this part is an attachment
    const isAttachment = (part: any): boolean => {
        if (!part) return false;

        // Check disposition
        if (part.disposition && part.disposition.type) {
            const dispType = part.disposition.type.toLowerCase();

            // Only count 'attachment' disposition, NOT 'inline'
            // Inline images (like signature images) should not be counted as attachments
            if (dispType === 'attachment') {
                return true;
            }

            // Skip inline dispositions (signature images, embedded images)
            if (dispType === 'inline') {
                return false;
            }
        }

        // Check if it's a non-text/html/image part (likely an attachment)
        if (part.type && part.subtype) {
            const type = part.type.toLowerCase();
            const subtype = part.subtype.toLowerCase();

            // Skip text/plain and text/html (email body)
            if (type === 'text' && (subtype === 'plain' || subtype === 'html')) {
                return false;
            }

            // Skip multipart containers
            if (type === 'multipart') {
                return false;
            }

            // Skip images without explicit 'attachment' disposition (likely inline/signature images)
            if (type === 'image') {
                return false;
            }

            // Anything else with a type is likely an attachment
            return true;
        }

        return false;
    };

    // Recursively check structure
    const checkParts = (parts: any): boolean => {
        if (!parts) return false;

        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (isAttachment(part)) return true;
                if (checkParts(part)) return true;
            }
        } else if (typeof parts === 'object') {
            if (isAttachment(parts)) return true;
            // Check nested parts
            if (parts.parts) {
                return checkParts(parts.parts);
            }
        }

        return false;
    };

    return checkParts(struct);
}

export async function POST(request: Request) {
    try {
        // Extract request body
        const body = await request.json();
        const requestedFolder = body.folder || 'INBOX'; // Default to INBOX
        const limit = body.limit || 50;

        // 1. Verify Authentication
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = String(session.user.id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server misconfiguration: Admin client unavailable' }, { status: 500 });
        }

        // 2. Fetch Assigned Email Credentials from DB using Admin Client to bypass RLS
        const { data: credentials, error: credError } = await supabaseAdmin
            .from('workspace_emails')
            .select('email, app_password')
            .eq('assigned_agent_id', userId)
            .single();

        if (credError || !credentials) {
            console.error('Credential lookup failed:', credError);
            return NextResponse.json(
                { error: 'No workspace email assigned to this account. Please contact Super Admin.' },
                { status: 403 }
            );
        }

        const email = credentials.email;
        const appPassword = credentials.app_password;


        // 3. Gmail IMAP configuration
        const imapConfig = {
            user: email,
            password: appPassword,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        };

        const emails: any[] = [];

        // Map folder names to Gmail folder names
        const folderMap: Record<string, string> = {
            'INBOX': 'INBOX',
            'Sent': '[Gmail]/Sent Mail',
            'Drafts': '[Gmail]/Drafts',
            'Spam': '[Gmail]/Spam',
            'Trash': '[Gmail]/Trash'
        };

        const gmailFolder = folderMap[requestedFolder] || requestedFolder;

        await new Promise((resolve, reject) => {
            const imap = new Imap(imapConfig);

            imap.once('ready', () => {

                imap.openBox(gmailFolder, true, (err, box) => {
                    if (err) {
                        console.error(`Error opening ${gmailFolder}:`, err);
                        reject(err);
                        return;
                    }


                    // Fetch last N emails
                    const fetchLimit = Math.min(limit, box.messages.total);
                    if (fetchLimit === 0) {
                        imap.end();
                        resolve(emails);
                        return;
                    }


                    const fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - fetchLimit + 1)}:*`, {
                        bodies: '',
                        struct: true
                    });

                    fetch.on('message', (msg, seqno) => {
                        let msgStruct: any = null;

                        msg.on('attributes', (attrs) => {
                            msgStruct = attrs.struct;
                        });

                        msg.on('body', (stream) => {
                            simpleParser(stream as any, async (err, parsed) => {
                                if (err) {
                                    console.error('Error parsing email:', err);
                                    return;
                                }

                                // Parse attachments from mailparser
                                let attachments = parsed.attachments?.map(att => ({
                                    filename: att.filename || 'unnamed',
                                    size: att.size || 0,
                                    contentType: att.contentType || 'application/octet-stream'
                                })) || [];

                                // Also check IMAP structure for attachments (more reliable)
                                const hasAttachmentsInStruct = checkStructureForAttachments(msgStruct);

                                // If structure says there are attachments but parser didn't find them,
                                // mark as having attachments anyway
                                const hasAttachments = attachments.length > 0 || hasAttachmentsInStruct;

                                // If we detected attachments via structure but didn't parse them,
                                // add a placeholder
                                if (hasAttachmentsInStruct && attachments.length === 0) {
                                    attachments = [{
                                        filename: 'attachment',
                                        size: 0,
                                        contentType: 'application/octet-stream'
                                    }];
                                }

                                const emailData = {
                                    from: (parsed.from as any)?.text || '',
                                    to: (parsed.to as any)?.text || '',
                                    cc: (parsed.cc as any)?.text || '',
                                    bcc: (parsed.bcc as any)?.text || '',
                                    subject: parsed.subject || '(No Subject)',
                                    body: parsed.text || parsed.html || '',
                                    date: parsed.date || new Date(),
                                    message_id: parsed.messageId || `${Date.now()}-${seqno}`,
                                    in_reply_to: parsed.inReplyTo || null,
                                    email_references: Array.isArray(parsed.references) ? parsed.references.join(' ') : (parsed.references || null),
                                    attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
                                    has_attachments: hasAttachments
                                };

                                emails.push(emailData);
                            });
                        });
                    });

                    fetch.once('error', (err) => {
                        console.error('Fetch error:', err);
                        reject(err);
                    });

                    fetch.once('end', () => {

                        imap.end();
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.once('end', () => {
                resolve(emails);
            });

            imap.connect();
        });

        // Wait a bit for parsing
        await new Promise(resolve => setTimeout(resolve, 2000));


        // Collect all message IDs from Gmail
        const gmailMessageIds = emails.map(e => e.message_id).filter(Boolean);

        let storedCount = 0;
        for (const emailData of emails) {
            try {
                const { error } = await supabaseAdmin
                    .from('emails')
                    .upsert({
                        ...emailData,
                        snippet: (emailData.body || '').substring(0, 200),
                        folder: requestedFolder,
                        is_read: false,
                        created_at: new Date().toISOString(),
                        owner_id: isUUID ? userId : null
                    }, {
                        onConflict: 'message_id',
                        ignoreDuplicates: false // Update existing emails with new data (including attachments)
                    });

                if (!error) {
                    storedCount++;
                } else {
                    console.error('Supabase Upsert Error:', JSON.stringify(error));
                }
            } catch (err) {
                console.error('Error storing email:', err);
            }
        }


        // Sync deletions: Remove emails from DB that are no longer in Gmail folder
        try {


            // Get all emails from database for this user and folder
            let dbQuery = supabaseAdmin
                .from('emails')
                .select('message_id')
                .eq('folder', requestedFolder); // Use the requested folder

            // Apply owner_id filter correctly
            if (isUUID) {
                dbQuery = dbQuery.eq('owner_id', userId);
            } else {
                dbQuery = dbQuery.is('owner_id', null);
            }

            const { data: dbEmails, error: fetchError } = await dbQuery;

            if (!fetchError && dbEmails) {
                const dbMessageIds = dbEmails.map(e => e.message_id).filter(Boolean);



                // Find emails that are in DB but not in Gmail (deleted from Gmail)
                const deletedMessageIds = dbMessageIds.filter(id => !gmailMessageIds.includes(id));

                if (deletedMessageIds.length > 0) {


                    let deleteQuery = supabaseAdmin
                        .from('emails')
                        .delete()
                        .in('message_id', deletedMessageIds)
                        .eq('folder', requestedFolder); // Use the requested folder

                    // Apply owner_id filter correctly for delete
                    if (isUUID) {
                        deleteQuery = deleteQuery.eq('owner_id', userId);
                    } else {
                        deleteQuery = deleteQuery.is('owner_id', null);
                    }

                    const { error: deleteError } = await deleteQuery;

                    if (deleteError) {
                        console.error('Error deleting synced emails:', deleteError);
                    } else {
                    }
                } else {
                }
            }
        } catch (syncErr) {
            console.error('Error syncing deletions:', syncErr);
            // Non-critical error, continue
        }

        try {
            // Fetch all emails for this user
            let threadQuery = supabaseAdmin
                .from('emails')
                .select('*');

            if (isUUID) {
                threadQuery = threadQuery.eq('owner_id', userId);
            } else {
                threadQuery = threadQuery.is('owner_id', null);
            }

            const { data: allEmails } = await threadQuery;

            if (allEmails && allEmails.length > 0) {
                // Group emails by message threading
                const threadMap = new Map<string, any[]>();

                allEmails.forEach(email => {
                    // Normalize subject for threading
                    const normalizedSubject = (email.subject || '(No Subject)')
                        .replace(/^((re|fwd):\s*)+/i, '')
                        .trim()
                        .toLowerCase();

                    if (!threadMap.has(normalizedSubject)) {
                        threadMap.set(normalizedSubject, []);
                    }
                    threadMap.get(normalizedSubject)!.push(email);
                });

                let threadUpdateCount = 0;

                // Update thread counts and attachment flags
                for (const [subject, threadEmails] of threadMap) {
                    const threadCount = threadEmails.length;

                    // Check if ANY email in the thread has attachments
                    const hasThreadAttachments = threadEmails.some(e => e.has_attachments);

                    // Update each email in the thread
                    for (const email of threadEmails) {
                        const updates: any = {
                            thread_count: threadCount
                        };

                        if (hasThreadAttachments) {
                            updates.thread_has_attachments = true;
                        } else {
                            updates.thread_has_attachments = false;
                        }

                        const { error: updateError } = await supabaseAdmin
                            .from('emails')
                            .update(updates)
                            .eq('id', email.id);

                        if (!updateError) {
                            threadUpdateCount++;
                        }
                    }
                }

            }
        } catch (threadErr) {
            console.error('Error calculating threads:', threadErr);
            // Non-critical error, continue
        }

        // Clean up sent drafts (remove drafts that were actually sent)
        try {
            // Get all emails from Drafts and Sent folders
            let draftsQuery = supabaseAdmin
                .from('emails')
                .select('*')
                .eq('folder', 'Drafts');

            let sentQuery = supabaseAdmin
                .from('emails')
                .select('*')
                .eq('folder', 'Sent');

            if (isUUID) {
                draftsQuery = draftsQuery.eq('owner_id', userId);
                sentQuery = sentQuery.eq('owner_id', userId);
            } else {
                draftsQuery = draftsQuery.is('owner_id', null);
                sentQuery = sentQuery.is('owner_id', null);
            }

            const { data: drafts } = await draftsQuery;
            const { data: sentEmails } = await sentQuery;

            if (drafts && sentEmails && drafts.length > 0 && sentEmails.length > 0) {
                const draftsToDelete: string[] = [];

                // Check each draft against sent emails
                drafts.forEach(draft => {
                    // Normalize subject for comparison
                    const draftSubject = (draft.subject || '').replace(/^((re|fwd):\s*)+/i, '').trim().toLowerCase();

                    // Find matching sent email (same subject, similar time - within 5 minutes)
                    const matchingSent = sentEmails.find(sent => {
                        const sentSubject = (sent.subject || '').replace(/^((re|fwd):\s*)+/i, '').trim().toLowerCase();
                        const timeDiff = Math.abs(new Date(sent.date).getTime() - new Date(draft.date).getTime());
                        const fiveMinutes = 5 * 60 * 1000;

                        return sentSubject === draftSubject && timeDiff < fiveMinutes;
                    });

                    if (matchingSent) {
                        draftsToDelete.push(draft.message_id);
                    }
                });

                if (draftsToDelete.length > 0) {

                    let deleteQuery = supabaseAdmin
                        .from('emails')
                        .delete()
                        .in('message_id', draftsToDelete)
                        .eq('folder', 'Drafts');

                    if (isUUID) {
                        deleteQuery = deleteQuery.eq('owner_id', userId);
                    } else {
                        deleteQuery = deleteQuery.is('owner_id', null);
                    }

                    const { error: deleteError } = await deleteQuery;

                    if (!deleteError) {
                    }
                }
            }
        } catch (cleanupErr) {
            console.error('Error cleaning up drafts:', cleanupErr);
            // Non-critical error, continue
        }

        return NextResponse.json({
            success: true,
            count: storedCount,
            connectedEmail: email, // Return which email was used
            message: `Successfully fetched emails for ${email}`
        });

    } catch (error: any) {
        console.error('❌ Gmail IMAP fetch error:', error);

        if (error.message?.includes('Invalid credentials') || error.message?.includes('authentication failed')) {
            return NextResponse.json({
                error: 'Authentication failed. Agent authorities might be invalid.'
            }, { status: 401 });
        }

        return NextResponse.json({
            error: error.message || 'Failed to fetch emails'
        }, { status: 500 });
    }
}
