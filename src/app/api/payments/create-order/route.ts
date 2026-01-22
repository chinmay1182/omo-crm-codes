import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);


// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S6uEQs8tSQjR9M',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'lC0EBjU1h1n4kNBUuRKMNTX2',
});


// POST - Create Razorpay order
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscriptionId, userId, amount, currency = 'INR' } = body;

        if (!subscriptionId || !userId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: currency,
            receipt: `sub_${subscriptionId}_${Date.now()}`,
            notes: {
                subscription_id: subscriptionId,
                user_id: userId,
            },
        };

        const order = await razorpay.orders.create(options);

        // Save payment record in database
        const { data: payment, error } = await supabase
            .from('payments')
            .insert({
                subscription_id: subscriptionId,
                user_id: userId,
                razorpay_order_id: order.id,
                amount: amount,
                currency: currency,
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating payment record:', error);
            return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
        }

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            paymentId: payment.id,
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
