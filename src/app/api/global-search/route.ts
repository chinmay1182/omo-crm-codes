
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length === 0) {
        return NextResponse.json([]);
    }

    const query = q.trim();
    const limit = 5; // Result limit per category

    try {
        // Check Agent Permissions
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');
        let agentPermissions: any = null;

        if (agentSession) {
            try {
                let sessionStr = agentSession.value;
                if (sessionStr.includes('%')) {
                    sessionStr = decodeURIComponent(sessionStr);
                }
                const sessionData = JSON.parse(sessionStr);
                const agent = sessionData.user || sessionData;
                agentPermissions = agent.permissions;
            } catch (e) {
                console.error("Error parsing agent session", e);
            }
        }

        // Run queries in parallel
        const [
            contactsRes,
            companiesRes,
            ticketsRes,
            leadsRes,
            tasksRes,
            appointmentsRes,
            formsRes,
            meetingsRes,
            notesRes,
            proposalsRes,
            servicesRes,
            agentsRes,
            emailsRes,
            conversationsRes, // For feedback/conversations if generic
            locationsRes,
            paymentsRes,
            refundsRes,
            settingsRes
        ] = await Promise.all([
            // 1. Contacts
            (async () => {
                if (agentPermissions && !agentPermissions.contacts?.includes('enable_disable')) return [];
                const { data } = await supabase
                    .from('contacts')
                    .select('id, first_name, last_name, email, phone')
                    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                    .limit(limit);
                return (data || []).map(item => ({
                    type: 'contact',
                    id: item.id,
                    title: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
                    subtitle: item.email || item.phone || 'Contact',
                    url: `/dashboard/contacts?id=${item.id}`,
                    icon: 'fa-user'
                }));
            })(),

            // 2. Companies
            (async () => {
                if (agentPermissions && !agentPermissions.contacts?.includes('enable_disable')) return [];
                const { data } = await supabase
                    .from('companies')
                    .select('id, name')
                    .ilike('name', `%${query}%`)
                    .limit(limit);
                return (data || []).map(item => ({
                    type: 'company',
                    id: item.id,
                    title: item.name,
                    subtitle: 'Company',
                    url: `/dashboard/contacts?companyId=${item.id}`,
                    icon: 'fa-building'
                }));
            })(),

            // 3. Tickets
            (async () => {
                if (agentPermissions && !agentPermissions.tickets?.includes('enable_disable')) return [];
                let ticketQuery = supabase
                    .from('tickets')
                    .select('id, ticket_number, subject, status, contact_name')
                    .limit(limit);

                if (!isNaN(Number(query))) {
                    ticketQuery = ticketQuery.eq('ticket_number', Number(query));
                } else {
                    ticketQuery = ticketQuery.or(`subject.ilike.%${query}%,contact_name.ilike.%${query}%`);
                }

                const { data } = await ticketQuery;

                return (data || []).map(item => ({
                    type: 'ticket',
                    id: item.id,
                    title: `#${item.ticket_number} - ${item.subject}`,
                    subtitle: item.status,
                    url: `/dashboard/tickets?ticketId=${item.id}`,
                    icon: 'fa-ticket'
                }));
            })(),

            // 4. Leads
            (async () => {
                const { data } = await supabase
                    .from('leads')
                    .select('id, custom_id, contact_person, company_name')
                    .or(`contact_person.ilike.%${query}%,company_name.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'lead',
                    id: item.id,
                    title: item.company_name || item.contact_person || 'Lead',
                    subtitle: item.contact_person || item.custom_id || '',
                    url: `/dashboard/lead-management?leadId=${item.id}`,
                    icon: 'fa-user-plus'
                }));
            })().catch(() => []),

            // 5. Tasks
            (async () => {
                const { data } = await supabase
                    .from('tasks')
                    .select('id, title, description')
                    .ilike('title', `%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'task',
                    id: item.id,
                    title: item.title,
                    subtitle: 'Task',
                    url: `/dashboard/tasks?taskId=${item.id}`,
                    icon: 'fa-check'
                }));
            })().catch(() => []),

            // 6. Appointments (Bookings)
            (async () => {
                const { data } = await supabase
                    .from('bookings')
                    .select('id, attendee_name, attendee_email, company_name')
                    .or(`attendee_name.ilike.%${query}%,attendee_email.ilike.%${query}%,company_name.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'appointment',
                    id: item.id,
                    title: item.attendee_name || 'Booking',
                    subtitle: item.company_name || item.attendee_email || 'Appointment',
                    url: `/dashboard/scheduling?bookingId=${item.id}`,
                    icon: 'fa-calendar-check'
                }));
            })().catch(() => []),

            // 7. Forms
            (async () => {
                if (agentPermissions && !agentPermissions.forms?.includes('enable_disable')) return [];
                const { data } = await supabase
                    .from('forms')
                    .select('id, name, description')
                    .ilike('name', `%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'form',
                    id: item.id,
                    title: item.name,
                    subtitle: item.description || 'Form',
                    url: `/dashboard/form-builder/${item.id}`,
                    icon: 'fa-file-lines'
                }));
            })().catch(() => []),

            // 8. Meetings (Company Meetings)
            (async () => {
                if (agentPermissions && !agentPermissions.meetings?.includes('enable_disable')) return [];
                const { data } = await supabase
                    .from('company_meetings')
                    .select('id, title, client_name')
                    .or(`title.ilike.%${query}%,client_name.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'meeting',
                    id: item.id,
                    title: item.title,
                    subtitle: item.client_name || 'Meeting',
                    url: `/dashboard/meetings?meetingId=${item.id}`,
                    icon: 'fa-handshake'
                }));
            })().catch(() => []),

            // 9. Notes
            (async () => {
                const { data } = await supabase
                    .from('notes')
                    .select('id, title, content')
                    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'note',
                    id: item.id,
                    title: item.title || 'Untitled Note',
                    subtitle: (item.content || '').substring(0, 30) + '...',
                    url: `/dashboard/notes?noteId=${item.id}`,
                    icon: 'fa-note-sticky'
                }));
            })().catch(() => []),

            // 10. Proposals
            (async () => {
                if (agentPermissions && !agentPermissions.leads?.includes('enable_disable')) return [];
                const { data } = await supabase
                    .from('proposals')
                    .select('id, proposal_number, proposal_to')
                    .or(`proposal_number.ilike.%${query}%,proposal_to.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'proposal',
                    id: item.id,
                    title: item.proposal_number || 'Proposal',
                    subtitle: `To: ${item.proposal_to}`,
                    url: `/dashboard/lead-management?proposalId=${item.id}`,
                    icon: 'fa-file-invoice-dollar'
                }));
            })().catch(() => []),

            // 11. Services
            (async () => {
                if (agentPermissions && !agentPermissions.services?.includes('enable_disable')) return [];
                const { data } = await supabase
                    .from('services')
                    .select('id, service_name, unique_service_code')
                    .or(`service_name.ilike.%${query}%,unique_service_code.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'service',
                    id: item.id,
                    title: item.service_name,
                    subtitle: item.unique_service_code || 'Service',
                    url: `/dashboard/services?serviceId=${item.id}`,
                    icon: 'fa-briefcase'
                }));
            })().catch(() => []),

            // 12. Agents
            (async () => {
                const { data } = await supabase
                    .from('agents')
                    .select('id, username, full_name, email')
                    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'agent',
                    id: item.id,
                    title: item.full_name || item.username,
                    subtitle: item.email || 'Agent',
                    url: `/dashboard/agents?id=${item.id}`,
                    icon: 'fa-user-tie'
                }));
            })().catch(() => []),

            // 13. Emails
            (async () => {
                // Use supabaseAdmin for emails as they might be protected or not exposed directly via public API without RLS
                if (!supabaseAdmin) return [];
                const { data } = await supabaseAdmin
                    .from('emails')
                    .select('id, subject, from, snippet')
                    .or(`subject.ilike.%${query}%,from.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'email',
                    id: item.id,
                    title: item.subject || 'No Subject',
                    subtitle: item.from || 'Email',
                    url: `/dashboard/emails?emailId=${item.id}`,
                    icon: 'fa-envelope'
                }));
            })().catch(() => []),

            // 14. Feedbacks (Try catch block)
            (async () => {
                try {
                    // Attempt to query 'feedbacks' - if table doesn't exist, this will fail gracefully
                    const { data, error } = await supabase
                        .from('feedbacks') // Assumptions: table exists
                        .select('id, title, comment')
                        .or(`title.ilike.%${query}%,comment.ilike.%${query}%`)
                        .limit(limit);

                    if (error || !data) return [];

                    return data.map((item: any) => ({
                        type: 'feedback',
                        id: item.id,
                        title: item.title || 'Feedback',
                        subtitle: (item.comment || '').substring(0, 30) + '...',
                        url: `/dashboard/feedbacks?id=${item.id}`,
                        icon: 'fa-comment-alt-dots'
                    }));
                } catch {
                    return [];
                }
            })(),

            // 15. Locations
            (async () => {
                const { data } = await supabase
                    .from('contact_locations')
                    .select('id, name, address, city')
                    .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'location',
                    id: item.id,
                    title: item.name || 'Location',
                    subtitle: `${item.address || ''} ${item.city || ''}`.trim(),
                    url: `/dashboard/locations?id=${item.id}`, // Placeholder URL, maybe contact detail?
                    icon: 'fa-map-location-dot'
                }));
            })().catch(() => []),

            // 16. Payments
            (async () => {
                const { data } = await supabase
                    .from('payments')
                    .select('id, amount, currency, status, razorpay_payment_id')
                    .or(`status.ilike.%${query}%,razorpay_payment_id.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'payment',
                    id: item.id,
                    title: `₹${item.amount} - ${item.status}`,
                    subtitle: `ID: ${item.razorpay_payment_id}`,
                    url: `/dashboard/subscriptions?tab=payment_history`, // Redirect to subscriptions page payment history
                    icon: 'fa-credit-card'
                }));
            })().catch(() => []),

            // 17. Refunds
            (async () => {
                const { data } = await supabase
                    .from('refunds')
                    .select('id, amount, status, razorpay_refund_id')
                    .or(`status.ilike.%${query}%,razorpay_refund_id.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'refund',
                    id: item.id,
                    title: `₹${item.amount} - ${item.status}`,
                    subtitle: `RefID: ${item.razorpay_refund_id}`,
                    url: `/dashboard/subscriptions?tab=refunds`, // Redirect to subscriptions page refunds
                    icon: 'fa-undo'
                }));
            })().catch(() => []),

            // 18. Settings (Static Search)
            (async () => {
                const settingsPages = [
                    { id: 'profile', title: 'User Profile', subtitle: 'Manage account details', url: '/dashboard/agent-info' },
                    { id: 'billing', title: 'Billing & Subscriptions', subtitle: 'Manage plans and payments', url: '/dashboard/subscriptions' },
                    { id: 'notifications', title: 'Notifications', subtitle: 'Configure alerts', url: '/dashboard/settings/notifications' },
                    { id: 'security', title: 'Security Settings', subtitle: 'Password and access', url: '/dashboard/settings/security' },
                    { id: 'integrations', title: 'Integrations', subtitle: 'Connect external apps', url: '/dashboard/settings/integrations' },
                    { id: 'email-settings', title: 'Email Settings', subtitle: 'Configure SMTP/IMAP', url: '/dashboard/email-setup' },
                    { id: 'voip-settings', title: 'VoIP Settings', subtitle: 'Manage numbers and IVR', url: '/dashboard/voip/settings' }
                ];

                const matchedSettings = settingsPages.filter(page =>
                    page.title.toLowerCase().includes(query.toLowerCase()) ||
                    page.subtitle.toLowerCase().includes(query.toLowerCase())
                );

                return matchedSettings.map(item => ({
                    type: 'setting',
                    id: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    url: item.url,
                    icon: 'fa-cog'
                }));
            })(),

            // 19. Agent Company Details
            (async () => {
                const { data } = await supabase
                    .from('agent_company_details')
                    .select('id, company_name, contact_person')
                    .or(`company_name.ilike.%${query}%,contact_person.ilike.%${query}%`)
                    .limit(limit);

                if (!data) return [];

                return data.map(item => ({
                    type: 'company_details',
                    id: item.id,
                    title: item.company_name,
                    subtitle: item.contact_person || 'My Company',
                    url: '/dashboard', // Would ideally open the modal
                    icon: 'fa-building-user'
                }));
            })().catch(() => [])

        ]);

        const results = [
            ...contactsRes,
            ...companiesRes,
            ...ticketsRes,
            ...leadsRes,
            ...tasksRes,
            ...appointmentsRes,
            ...formsRes,
            ...meetingsRes,
            ...notesRes,
            ...proposalsRes,
            ...servicesRes,
            ...agentsRes,
            ...emailsRes,
            ...conversationsRes,
            ...locationsRes,
            ...paymentsRes,
            ...refundsRes,
            ...settingsRes
        ];

        return NextResponse.json(results);

    } catch (error: any) {
        console.error('Global search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
