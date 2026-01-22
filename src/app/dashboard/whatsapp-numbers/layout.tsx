import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'WhatsApp Numbers - WhatsApp Management & Tracking',
    description: 'Manage WhatsApp numbers.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
