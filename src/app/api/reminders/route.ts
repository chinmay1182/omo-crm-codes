import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionOrAgent } from '@/app/lib/auth-helper';

export async function GET(request: Request) {
    try {
        const session = await getSessionOrAgent(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const agentId = String(session.user.id);

        const { data: tasks } = await supabase
            .from('company_tasks')
            .select('id, title, due_date, status, assigned_to')
            .neq('status', 'completed')
            .not('due_date', 'is', null) // cleaner syntax
            .order('due_date', { ascending: true });

        const { data: meetings } = await supabase
            .from('company_meetings')
            .select('id, title, meeting_date, status, created_by')
            .neq('status', 'completed')
            .neq('status', 'cancelled')
            .order('meeting_date', { ascending: true });

        const { data: leads } = await supabase
            .from('leads')
            .select('id, assignment_name, closing_date, stage')
            .eq('assigned_to', agentId)
            .neq('stage', 'Closed Won')
            .neq('stage', 'Closed Lost')
            .not('closing_date', 'is', null);

        const { data: proposals } = await supabase
            .from('proposals')
            .select(`
                id, proposal_number, expiry_date, proposal_status,
                leads!inner ( assigned_to )
            `)
            .eq('leads.assigned_to', agentId)
            .neq('proposal_status', 'expired')
            .neq('proposal_status', 'accepted')
            .neq('proposal_status', 'drop')
            .not('expiry_date', 'is', null);


        const reminders: any[] = [];
        const now = new Date();

        // Process Tasks
        if (tasks) {
            tasks.forEach((t: any) => {
                const dueDate = new Date(t.due_date);
                // Allow ALL future tasks, classify as overdue or upcoming
                const isOverdue = dueDate < now && t.status !== 'completed';
                const isDueSoon = dueDate >= now; // Just "Upcoming"

                // Add to reminders
                reminders.push({
                    type: 'task',
                    id: t.id,
                    title: t.title,
                    date: t.due_date,
                    isOverdue: isOverdue,
                    isDueSoon: isDueSoon,
                    url: `/dashboard/tasks`
                });
            });
        }

        // Process Meetings
        if (meetings) {
            meetings.forEach((m: any) => {
                const startTime = new Date(m.meeting_date);
                if (startTime >= now) {
                    reminders.push({
                        type: 'meeting',
                        id: m.id,
                        title: m.title,
                        date: m.meeting_date,
                        isOverdue: false,
                        isDueSoon: true,
                        url: `/dashboard/meetings?date=${m.meeting_date.split('T')[0]}`
                    });
                }
            });
        }

        // Process Leads
        if (leads) {
            leads.forEach((l: any) => {
                const closingDate = new Date(l.closing_date);
                if (closingDate >= now) {
                    reminders.push({
                        type: 'lead',
                        id: l.id,
                        title: `Lead: ${l.assignment_name}`,
                        date: l.closing_date,
                        isOverdue: false,
                        isDueSoon: true,
                        url: `/dashboard/leads`
                    });
                }
            });
        }

        // Process Proposals
        if (proposals) {
            proposals.forEach((p: any) => {
                const expiryDate = new Date(p.expiry_date);
                if (expiryDate >= now) {
                    reminders.push({
                        type: 'proposal',
                        id: p.id,
                        title: `Proposal: ${p.proposal_number}`,
                        date: p.expiry_date,
                        isOverdue: false,
                        isDueSoon: true,
                        url: `/dashboard/proposals`
                    });
                }
            });
        }

        // Filter out irrelevant ones (e.g. far future if filtering wasn't strict)
        // Sort: Overdue first, then by time.
        const sortedReminders = reminders
            .filter(r => r.isOverdue || r.isDueSoon)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({ reminders: sortedReminders });

    } catch (error) {
        console.error("Error fetching reminders", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
