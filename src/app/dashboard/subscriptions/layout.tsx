import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscriptions - Choose Your Plan',
  description: 'Select the perfect subscription plan for your business needs. All plans include a 14-day free trial.',
};

export default function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}