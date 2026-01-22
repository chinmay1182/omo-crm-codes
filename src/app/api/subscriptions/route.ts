import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);



// GET - Fetch user's subscription
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Get active subscription
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['trial', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching subscription:', error);
            return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }

        // Calculate trial days remaining
        let trialDaysRemaining = 0;
        if (subscription && subscription.status === 'trial' && subscription.trial_end_date) {
            const now = new Date();
            const trialEnd = new Date(subscription.trial_end_date);
            const diffTime = trialEnd.getTime() - now.getTime();
            trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            trialDaysRemaining = Math.max(0, trialDaysRemaining);
        }

        return NextResponse.json({
            subscription: subscription || null,
            trialDaysRemaining,
        });
    } catch (error) {
        console.error('Error in GET /api/subscriptions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or update subscription
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, planId, planName, billingCycle, amount } = body;

        if (!userId || !planId || !planName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user already has an active subscription
        const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['trial', 'active'])
            .single();

        if (existingSubscription) {
            // Update existing subscription
            const { data, error } = await supabase
                .from('subscriptions')
                .update({
                    plan_id: planId,
                    plan_name: planName,
                    billing_cycle: billingCycle || 'monthly',
                    amount: amount,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingSubscription.id)
                .select()
                .single();

            if (error) {
                console.error('Error updating subscription:', error);
                return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
            }

            return NextResponse.json({ subscription: data });
        } else {
            // Create new subscription with trial
            const trialStartDate = new Date();
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial

            const { data, error } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    plan_id: planId,
                    plan_name: planName,
                    status: 'trial',
                    trial_start_date: trialStartDate.toISOString(),
                    trial_end_date: trialEndDate.toISOString(),
                    billing_cycle: billingCycle || 'monthly',
                    amount: amount,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating subscription:', error);
                return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
            }

            return NextResponse.json({ subscription: data });
        }
    } catch (error) {
        console.error('Error in POST /api/subscriptions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Activate subscription after payment
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscriptionId, paymentId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
        }

        const subscriptionStartDate = new Date();
        const subscriptionEndDate = new Date();

        // Get subscription to check billing cycle
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('billing_cycle')
            .eq('id', subscriptionId)
            .single();

        if (subscription?.billing_cycle === 'yearly') {
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        } else {
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                subscription_start_date: subscriptionStartDate.toISOString(),
                subscription_end_date: subscriptionEndDate.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId)
            .select()
            .single();

        if (error) {
            console.error('Error activating subscription:', error);
            return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
        }

        return NextResponse.json({ subscription: data });
    } catch (error) {
        console.error('Error in PUT /api/subscriptions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
