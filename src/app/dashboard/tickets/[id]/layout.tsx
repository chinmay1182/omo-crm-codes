import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ticket Details - Ticket Management & Support',
    description: 'View ticket details.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
