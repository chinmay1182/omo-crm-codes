import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function GET(request: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
        return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('agent_company_details')
            .select('*')
            .eq('agent_id', agentId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
            throw error;
        }

        return NextResponse.json(data || {});
    } catch (error: any) {
        console.error('Error fetching company details:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
    }
    try {
        const body = await request.json();
        const { agentId, ...details } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
        }

        // Check for duplicates (Company Name, Email, Phone) excluding current agent
        const { data: duplicateCheck } = await supabaseAdmin
            .from('agent_company_details')
            .select('id, company_name, company_email, company_phone')
            .neq('agent_id', agentId)
            .or(`company_name.eq."${details.companyName}",company_email.eq."${details.email}",company_phone.eq."${details.companyPhone}"`)
            .maybeSingle();

        if (duplicateCheck) {
            let field = '';
            if (duplicateCheck.company_name === details.companyName) field = 'Company Name';
            else if (duplicateCheck.company_email === details.email) field = 'Company Email';
            else if (duplicateCheck.company_phone === details.companyPhone) field = 'Company Phone';

            return NextResponse.json({ error: `${field} is already registered with another account.` }, { status: 400 });
        }

        // Map frontend fields to DB columns
        const dbPayload = {
            agent_id: agentId,
            company_name: details.companyName,
            address_street: details.street,
            address_street_2: details.street2,
            address_landmark: details.landmark,
            address_state: details.state,
            address_city: details.city,
            address_pincode: details.pincode,
            company_email: details.email,
            company_phone: details.companyPhone,
            contact_person: details.contactPerson,
            cin: details.cin,
            gstin: details.gstin
        };

        // Check if exists
        const { data: existing } = await supabaseAdmin
            .from('agent_company_details')
            .select('id')
            .eq('agent_id', agentId)
            .single();

        let error;
        if (existing) {
            const res = await supabaseAdmin
                .from('agent_company_details')
                .update(dbPayload)
                .eq('agent_id', agentId);
            error = res.error;
        } else {
            const res = await supabaseAdmin
                .from('agent_company_details')
                .insert([dbPayload]);
            error = res.error;
        }

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving company details:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
