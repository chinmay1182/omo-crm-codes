
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Simple validation
        if (!body.subject || !body.contact_email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Auto-calculate SLA (defaulting to SLA-1)
        let sla_deadline = new Date();
        sla_deadline.setHours(sla_deadline.getHours() + 4);

        // 3. Handle Contact Logic (Duplicate Check & Auto Creation)
        let contactId = null;
        let isRedFlag = false;
        const email = body.contact_email;
        const phone = body.contact_phone;
        const contactName = body.contact_name || '';

        // Search for existing contact
        let query = supabase.from('contacts').select('id, first_name, last_name, email, phone, mobile');

        if (email && phone) {
            query = query.or(`email.eq.${email},phone.eq.${phone},mobile.eq.${phone}`);
        } else {
            query = query.eq('email', email);
        }

        const { data: existingContacts } = await query;

        if (existingContacts && existingContacts.length > 0) {
            const match = existingContacts[0];
            contactId = match.id;

            // Check for name mismatch (Red Flag)
            const dbName = `${match.first_name || ''} ${match.last_name || ''}`.trim().toLowerCase();
            const providedName = contactName.trim().toLowerCase();

            if (providedName && dbName && !dbName.includes(providedName) && !providedName.includes(dbName)) {
                isRedFlag = true;
            }

            // Check for duplicate phone number (Red Flag as per request)
            if (phone && (match.phone === phone || match.mobile === phone)) {
                isRedFlag = true;
            }
        } else {
            // Create New Contact
            const nameParts = contactName.trim().split(' ');
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (nameParts[0] ? '-' : 'User');

            const { data: newContact, error: createError } = await supabase
                .from('contacts')
                .insert([{
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone || null,
                    display_id: generateId(),
                    description: 'Auto-created from Public Ticket Form'
                }])
                .select('id')
                .single();

            if (!createError && newContact) {
                contactId = newContact.id;
            }
        }

        // 4. Create Ticket
        const ticketData = {
            subject: body.subject,
            description: body.description,
            category: body.category,
            source: 'Web',
            priority: 'Medium',
            contact_id: contactId,
            contact_name: body.contact_name,
            contact_email: body.contact_email,
            contact_phone: body.contact_phone,
            sla_policy: 'SLA-1',
            sla_deadline: sla_deadline.toISOString(),
            status: 'Open',
            is_red_flag: isRedFlag
        };

        const { data, error } = await supabase
            .from('tickets')
            .insert([ticketData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
