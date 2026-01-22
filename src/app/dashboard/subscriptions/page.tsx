'use client';

import { useState } from 'react';
import styles from './subscriptions.module.css';
import toast from 'react-hot-toast';

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
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: 'month',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 5 team members',
      'Basic CRM features',
      '1,000 contacts',
      'Email support',
      'Basic reporting',
      'Mobile app access'
    ],
    buttonText: 'Start Free Trial',
    buttonStyle: 'secondary'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    period: 'month',
    description: 'Best for growing businesses',
    features: [
      'Up to 25 team members',
      'Advanced CRM features',
      '10,000 contacts',
      'Priority email & chat support',
      'Advanced reporting & analytics',
      'API access',
      'Custom integrations',
      'WhatsApp Business integration',
      'VoIP calling included'
    ],
    popular: true,
    buttonText: 'Start Free Trial',
    buttonStyle: 'primary'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: 'month',
    description: 'For large organizations with advanced needs',
    features: [
      'Unlimited team members',
      'Full CRM suite',
      'Unlimited contacts',
      '24/7 phone & email support',
      'Custom reporting & dashboards',
      'Advanced API access',
      'Custom integrations',
      'Dedicated account manager',
      'Advanced security features',
      'Custom branding',
      'SLA guarantee'
    ],
    buttonText: 'Contact Sales',
    buttonStyle: 'premium'
  }
];

export default function SubscriptionsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showComparison, setShowComparison] = useState(false);

  const handlePlanSelect = async (planId: string) => {
    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (planId === 'enterprise') {
        toast.success('Our sales team will contact you within 24 hours!');
      } else {
        toast.success('Redirecting to checkout...');
        // Here you would redirect to payment processor
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
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
                    }`}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading}
                >
                  {selectedPlan === plan.id && isLoading ? (
                    <>
                      <i className="fa-sharp fa-solid fa-spinner fa-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>




      </div>
      {/* FAQ Section */}
      {/* <div className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4>Can I change my plan later?</h4>
            <p>Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Is there a free trial?</h4>
            <p>Yes, all plans come with a 14-day free trial. No credit card required to start.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>What payment methods do you accept?</h4>
            <p>We accept all major credit cards, PayPal, and bank transfers for enterprise customers.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Can I cancel anytime?</h4>
            <p>Yes, you can cancel your subscription at any time. Your account will remain active until the end of your billing period.</p>
          </div>
        </div>
      </div> */}
    </div>
  );
}