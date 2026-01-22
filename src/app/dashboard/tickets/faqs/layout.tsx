import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ticket FAQs - Ticket Management & Support',
    description: 'Frequently Asked Questions about tickets.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
