import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from "@/app/lib/session";

export async function GET(request: Request) {
    // Security Check: Verify Agent Session
    const session = getSessionFromRequest(request as any);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const agentId = requestUrl.searchParams.get('agentId');

    if (!agentId) {
        return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Authorization: Ensure agent is accessing their own data (or is admin)
    // Assuming simple check: authenticated user ID must match requested agentId
    // Note: session.user.id might be string or number, ensure comparison works
    if (String(session.user.id) !== String(agentId)) {
        // Optional: Allow admins to view others? For now strict.
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { data, error } = await supabase
            .from('agent_payment_details')
            .select('*')
            .eq('agent_id', agentId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error fetching payment details:', error);
            // Return empty object if not found instead of error for smooth UI
            if (error.code === 'PGRST116') return NextResponse.json({});
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || {});
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // Security Check: Verify Agent Session
    const session = getSessionFromRequest(request as any);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { agentId, bankName, accountNumber, ifscCode, accountHolderName, upiId } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
        }

        // Authorization Check
        if (String(session.user.id) !== String(agentId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check if record exists
        const { data: existingData } = await supabase
            .from('agent_payment_details')
            .select('id')
            .eq('agent_id', agentId)
            .single();

        const payload = {
            agent_id: agentId,
            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            account_holder_name: accountHolderName,
            upi_id: upiId,
            updated_at: new Date().toISOString()
        };

        let result;
        if (existingData) {
            // Update
            result = await supabase
                .from('agent_payment_details')
                .update(payload)
                .eq('agent_id', agentId);
        } else {
            // Insert
            result = await supabase
                .from('agent_payment_details')
                .insert(payload);
        }

        if (result.error) {
            console.error('Error saving payment details:', result.error);
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
