'use client';

import { useState, useEffect } from 'react';
import styles from './subscriptions.module.css';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NDA3NTUsImV4cCI6MjA1MDAxNjc1NX0.TqJOJzHMo-Iy7ggRQTTlHwFHYUCrRIqfJmNnJYXfvzk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  buttonText: string;
  buttonStyle: 'primary' | 'secondary' | 'premium';
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 99,
    period: 'month',
    description: 'Perfect for Startups & small teams',
    features: [
      'Admin + 2 Users included',
      'Core CRM Essentials',
      'Email Sync',
      'Lead & Contact Management - Capture & track leads',
      'Task Management',
      'Notes Management',
      'Roles & Permissions - Granular access control',
      'Admin Controls - Centralized management',
      '5 GB Storage',
      'Get organized fast'
    ],
    buttonText: 'Start Free Trial',
    buttonStyle: 'secondary'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    period: 'month',
    description: 'Growing businesses & sales teams',
    features: [
      'Admin + 5 Users included',
      'Core CRM Essentials',
      'Email Sync',
      'Lead & Contact Management - Optimize conversions',
      'Task Management',
      'Notes Management',
      'Ticket Management - Improve customer support',
      'Appointment Scheduling - Close deals faster',
      'Roles & Permissions - Granular access control',
      'Feedback Management - Voice of customer insights',
      'Admin Controls - Centralized management',
      '10 GB Storage',
      'Faster growth & efficiency'
    ],
    popular: true,
    buttonText: 'Start Free Trial',
    buttonStyle: 'primary'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    period: 'month',
    description: 'Enterprises & multi-team orgs',
    features: [
      'Admin + 10 Users included',
      'Core CRM Essentials',
      'Email Sync',
      'Lead & Contact Management - Enterprise-grade CRM',
      'Task Management',
      'Notes Management',
      'Ticket Management - Improve customer support',
      'Appointment Scheduling - High-volume scheduling',
      'Roles & Permissions - Granular access control',
      'Feedback Management - Voice of customer insights',
      'Custom Workflows - Tailored to your processes',
      'Advanced Reporting - Data-driven decisions',
      'Admin Controls - Centralized management',
      '15 GB Storage',
      'Maximum performance & control'
    ],
    buttonText: 'Contact Sales',
    buttonStyle: 'premium'
  }
];



declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch current subscription
  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
    }
  }, [user]);

  // Subscribe to real-time subscription changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions?userId=${user?.id}`);
      const data = await response.json();

      if (data.subscription) {
        setCurrentSubscription(data.subscription);
        setTrialDaysRemaining(data.trialDaysRemaining || 0);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handlePlanSelect = async (plan: PricingPlan) => {
    if (!user?.id) {
      toast.error('Please login to continue');
      return;
    }

    setIsLoading(true);
    setSelectedPlan(plan.id);

    try {
      if (plan.id === 'enterprise') {
        toast.success('Our sales team will contact you within 24 hours!');
        setIsLoading(false);
        setSelectedPlan(null);
        return;
      }

      // Check if user already has a subscription
      if (!currentSubscription) {
        // Create new subscription with trial
        const response = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            planId: plan.id,
            planName: plan.name,
            billingCycle: billingCycle,
            amount: getDiscountedPrice(plan.price),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('14-day free trial started! Enjoy all features.');
          setCurrentSubscription(data.subscription);
          setTrialDaysRemaining(14);
        } else {
          toast.error(data.error || 'Failed to start trial');
        }
      } else {
        // User has subscription, proceed to payment
        await initiatePayment(plan);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const initiatePayment = async (plan: PricingPlan) => {
    try {
      const amount = getDiscountedPrice(plan.price);

      // Create Razorpay order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: currentSubscription.id,
          userId: user?.id,
          amount: amount,
          currency: 'INR',
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        toast.error(orderData.error || 'Failed to create order');
        return;
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_S6uEQs8tSQjR9M',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Consolegal CRM',
        description: `${plan.name} Plan - ${billingCycle}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Verify payment
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: orderData.paymentId,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyResponse.ok) {
            toast.success('Payment successful! Your subscription is now active.');
            fetchSubscription();
          } else {
            toast.error(verifyData.error || 'Payment verification failed');
          }
        },
        prefill: {
          name: user?.full_name || user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
    }
  };

  const getDiscountedPrice = (price: number) => {
    return billingCycle === 'yearly' ? Math.round(price * 0.8) : price;
  };

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Choose Your Plan</h1>
          <p className={styles.subtitle}>
            Select the perfect plan for your business needs. All plans include a 14-day free trial.
          </p>

          {/* Current Subscription Status */}
          {currentSubscription && (
            <div className={styles.currentPlanBanner}>
              {currentSubscription.status === 'trial' ? (
                <p>
                  🎉 You're on a <strong>14-day free trial</strong> of the{' '}
                  <strong>{currentSubscription.plan_name}</strong> plan.{' '}
                  {trialDaysRemaining > 0 ? (
                    <span>{trialDaysRemaining} days remaining.</span>
                  ) : (
                    <span className={styles.trialExpired}>Trial expired. Please subscribe to continue.</span>
                  )}
                </p>
              ) : (
                <p>
                  ✅ You're currently on the <strong>{currentSubscription.plan_name}</strong> plan.
                </p>
              )}
            </div>
          )}

          {/* Billing Toggle */}
          <div className={styles.billingToggle}>
            <button
              className={`${styles.toggleButton} ${billingCycle === 'monthly' ? styles.active : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`${styles.toggleButton} ${billingCycle === 'yearly' ? styles.active : ''}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className={styles.plansGrid}>
          {pricingPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={`${styles.planCard} ${plan.popular ? styles.popularPlan : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}

              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <span className={styles.currency}>₹</span>
                  <span className={styles.amount}>{getDiscountedPrice(plan.price)}</span>
                  <span className={styles.period}>/{plan.period}</span>
                </div>
                {billingCycle === 'yearly' && plan.price !== getDiscountedPrice(plan.price) && (
                  <div className={styles.originalPrice}>
                    <span>Was ₹{plan.price}/{plan.period}</span>
                  </div>
                )}
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              <div className={styles.planFeatures}>
                <ul className={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <li key={index} className={styles.feature}>
                      <i className="fa-sharp fa-thin fa-check" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.planFooter}>
                <button
                  className={`${styles.planButton} ${styles[plan.buttonStyle]} ${selectedPlan === plan.id && isLoading ? styles.loading : ''
                    } ${currentSubscription?.plan_id === plan.id ? styles.currentPlan : ''}`}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={isLoading || (currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'active')}
                >
                  {selectedPlan === plan.id && isLoading ? (
                    <>
                      <i className="fa-sharp fa-solid fa-spinner fa-spin" />
                      Processing...
                    </>
                  ) : currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'active' ? (
                    'Current Plan'
                  ) : currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'trial' ? (
                    'Upgrade Now'
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
