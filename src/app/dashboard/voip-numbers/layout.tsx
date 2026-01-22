import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'VoIP Numbers - VoIP Management & Tracking',
    description: 'Manage VoIP numbers.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
