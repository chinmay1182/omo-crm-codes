import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);



// GET - Fetch payment history for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Fetch payments
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select(`
        *,
        subscriptions (
          plan_name,
          billing_cycle
        )
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (paymentsError) {
            console.error('Error fetching payments:', paymentsError);
            return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
        }

        // Fetch refunds
        const { data: refunds, error: refundsError } = await supabase
            .from('refunds')
            .select(`
        *,
        payments (
          amount,
          currency,
          razorpay_payment_id
        )
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (refundsError) {
            console.error('Error fetching refunds:', refundsError);
            return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 });
        }

        return NextResponse.json({
            payments: payments || [],
            refunds: refunds || [],
        });
    } catch (error) {
        console.error('Error in GET /api/payments/history:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
