import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Email Setup - Email Management',
    description: 'Configure email settings.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
