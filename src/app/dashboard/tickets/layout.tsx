import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Support Tickets - Ticket Management & Support',
    description: 'Manage support tickets and issues.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
