import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Create Ticket - Ticket Management & Support',
    description: 'Create a new support ticket.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
