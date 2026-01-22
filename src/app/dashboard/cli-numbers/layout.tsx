import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'CLI Numbers - CLI Management & Tracking',
    description: 'Manage CLI numbers.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
