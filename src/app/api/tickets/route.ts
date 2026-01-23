import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';
import { cookies } from 'next/headers';

const generateId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// Helper function to find or create contact and check for flags
async function handleTicketContact(body: any) {
    let contactId = body.contact_id;
    let isRedFlag = false;
    let contactName = body.contact_name || '';
    const email = body.contact_email;
    const phone = body.contact_phone;

    // 1. If contact_id is already provided, check if they have existing tickets
    if (contactId) {
        // Check how many tickets this contact has
        const { data: existingTickets } = await supabase
            .from('tickets')
            .select('id')
            .eq('contact_id', contactId);

        // Red flag if contact already has tickets (repeat customer)
        isRedFlag = !!(existingTickets && existingTickets.length > 0);
        return { contactId, isRedFlag };
    }

    // 2. Search for existing contact by email or phone
    let query = supabase.from('contacts').select('id, first_name, last_name, email, phone, mobile');

    if (email && phone) {
        query = query.or(`email.eq.${email},phone.eq.${phone},mobile.eq.${phone}`);
    } else if (email) {
        query = query.eq('email', email);
    } else if (phone) {
        query = query.or(`phone.eq.${phone},mobile.eq.${phone}`);
    } else {
        // No contact info provided, can't link or create
        // This is a new ticket without contact info - Green Flag
        return { contactId: null, isRedFlag: false };
    }

    const { data: existingContacts } = await query;

    if (existingContacts && existingContacts.length > 0) {
        // Contact exists in system
        const match = existingContacts[0];
        contactId = match.id;

        // Check how many tickets this contact has raised
        const { data: existingTickets } = await supabase
            .from('tickets')
            .select('id')
            .eq('contact_id', contactId);

        // 🔴 Red Flag: Contact exists and has raised tickets before (repeat customer)
        isRedFlag = !!(existingTickets && existingTickets.length > 0);

    } else {
        // 4. Create New Contact - 🟢 Green Flag (new customer, first ticket)
        isRedFlag = false;

        // Parse first/last name
        const nameParts = contactName.trim().split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (nameParts[0] ? '-' : 'User');

        const { data: newContact, error } = await supabase
            .from('contacts')
            .insert([{
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                phone: phone || null,
                display_id: generateId(),
                description: 'Auto-created from Ticket System'
            }])
            .select('id')
            .single();

        if (!error && newContact) {
            contactId = newContact.id;
        }
    }

    return { contactId, isRedFlag };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check Agent Permissions
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');

        if (agentSession) {
            try {
                const sessionData = JSON.parse(agentSession.value);
                const agent = sessionData.user || sessionData;
                const permissions = agent.permissions;

                if (!permissions?.tickets?.includes('enable_disable')) {
                    return NextResponse.json({ error: 'Access Denied: Tickets module disabled' }, { status: 403 });
                }
                if (!permissions?.tickets?.includes('create')) {
                    return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
                }
            } catch (e) {
            }
        }


        // Calculate SLA Deadline
        let sla_deadline = null;
        const now = new Date();
        if (body.sla_policy === 'SLA-1') {
            sla_deadline = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        } else if (body.sla_policy === 'SLA-2') {
            sla_deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (body.sla_policy === 'SLA-3') {
            sla_deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        }

        // Handle Contact Logic (Find, Create, Flag)
        const { contactId, isRedFlag } = await handleTicketContact(body);

        const ticketData = {
            subject: body.subject,
            description: body.description,
            category: body.category,
            source: body.source,
            priority: body.priority,
            sla_policy: body.sla_policy,
            contact_name: body.contact_name,
            contact_email: body.contact_email,
            contact_phone: body.contact_phone,
            contact_id: contactId,
            is_red_flag: isRedFlag,
            sla_deadline: sla_deadline ? sla_deadline.toISOString() : null,
            status: body.status || 'Open',
            internal_notes: body.internal_notes || null,
            assigned_to: body.assigned_to && body.assigned_to !== '' ? body.assigned_to : null
        };


        const { data, error } = await supabase
            .from('tickets')
            .insert([ticketData])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message, details: error }, { status: 500 });
        }

        // Create notification if assigned
        if (data.assigned_to) {
            try {
                const { data: agent } = await supabase
                    .from('agents')
                    .select('full_name, username')
                    .eq('id', data.assigned_to)
                    .single();

                if (agent) {
                    await supabase.from('notifications').insert([
                        {
                            title: 'New Ticket Assigned',
                            message: `Ticket #${data.ticket_number || data.id} "${data.subject}" assigned to you`,
                            type: 'info',
                            related_id: data.id,
                            related_type: 'ticket'
                        }
                    ]);
                }
            } catch (notifError) {
                console.error('Error creating notification for ticket:', notifError);
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating ticket:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error?.message || 'Unknown error',
            stack: error?.stack
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assigned_to');
    const search = searchParams.get('search');

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let agentId: string | null = null;
    let agentPermissions: any = null;

    if (agentSession) {
        try {
            const sessionData = JSON.parse(agentSession.value);
            const agent = sessionData.user || sessionData;
            agentId = agent.id;
            agentPermissions = agent.permissions;

            if (!agentPermissions?.tickets?.includes('enable_disable')) {
                return NextResponse.json({ error: 'Access Denied: Tickets module disabled' }, { status: 403 });
            }
        } catch (e) {
            console.error("Error parsing agent session", e);
        }
    }

    let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    // Enforce View Permissions
    if (agentPermissions) {
        const canViewAll = agentPermissions.tickets?.includes('view_all');
        const canViewAssigned = agentPermissions.tickets?.includes('view_assigned');

        if (!canViewAll) {
            if (canViewAssigned && agentId) {
                query = query.eq('assigned_to', agentId);
            } else {
                return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
            }
        }
    }

    if (status) {
        query = query.eq('status', status);
    }
    if (category) {
        query = query.eq('category', category);
    }
    if (assignedTo) {
        // Enforce alignment: If viewing assigned only, ensure status/search filter context respects assignment, 
        // but explicit query param shouldn't override permissions.
        // We already forced strict permission filter above. 
        // Adding this user-filter is safe as it's an AND condition.
        query = query.eq('assigned_to', assignedTo);
    }

    if (search) {
        // Check if search input looks like a number (for ticket ID)
        if (!isNaN(Number(search)) && search.trim() !== '') {
            // Include ticket_number in search
            query = query.or(`ticket_number.eq.${search},contact_name.ilike.%${search}%,subject.ilike.%${search}%`);
        } else {
            // Text only search
            query = query.or(`contact_name.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error('GET /tickets Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
