import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);



// POST - Verify Razorpay payment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentId,
        } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify signature
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'lC0EBjU1h1n4kNBUuRKMNTX2')
            .update(text)
            .digest('hex');


        if (generated_signature !== razorpay_signature) {
            // Update payment status to failed
            await supabase
                .from('payments')
                .update({
                    status: 'failed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', paymentId);

            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // Update payment record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .update({
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,
                status: 'success',
                payment_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (paymentError) {
            console.error('Error updating payment:', paymentError);
            return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
        }

        // Activate subscription
        const { data: subscription, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', payment.subscription_id)
            .single();

        if (subscriptionError) {
            console.error('Error fetching subscription:', subscriptionError);
            return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }

        const subscriptionStartDate = new Date();
        const subscriptionEndDate = new Date();

        if (subscription.billing_cycle === 'yearly') {
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        } else {
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        }

        await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                subscription_start_date: subscriptionStartDate.toISOString(),
                subscription_end_date: subscriptionEndDate.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', payment.subscription_id);

        return NextResponse.json({
            success: true,
            payment,
            message: 'Payment verified and subscription activated',
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
}
