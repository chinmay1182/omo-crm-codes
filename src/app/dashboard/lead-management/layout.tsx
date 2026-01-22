import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Lead Tracker - Lead Management & Tracking',
    description: 'Track and manage your leads.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
