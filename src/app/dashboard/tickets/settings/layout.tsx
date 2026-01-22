import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ticket Settings - Ticket Management & Support',
    description: 'Configure ticket settings.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
