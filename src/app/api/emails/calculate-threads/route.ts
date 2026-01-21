import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { getSession } from '@/app/lib/session';

export async function POST(request: Request) {
    try {
        // Verify Authentication
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = String(session.user.id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }



        // Fetch all emails for this user
        let query = supabaseAdmin
            .from('emails')
            .select('*');

        if (isUUID) {
            query = query.eq('owner_id', userId);
        } else {
            query = query.is('owner_id', null);
        }

        const { data: allEmails, error } = await query;

        if (error) {
            console.error('Error fetching emails:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }


        // Group emails by message threading
        const threadMap = new Map<string, any[]>();

        allEmails?.forEach(email => {
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

        let updatedCount = 0;

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

                // If this specific email doesn't have attachments but thread does,
                // we'll still keep its own has_attachments as false
                // But we can add a new field thread_has_attachments
                if (hasThreadAttachments) {
                    updates.thread_has_attachments = true;
                }

                const { error: updateError } = await supabaseAdmin
                    .from('emails')
                    .update(updates)
                    .eq('id', email.id);

                if (!updateError) {
                    updatedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updatedCount} emails`,
            threadsProcessed: threadMap.size
        });

    } catch (error: any) {
        console.error('Error calculating threads:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
