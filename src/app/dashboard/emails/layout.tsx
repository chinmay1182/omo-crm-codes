import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Email Inbox - Email & SMS Management',
    description: 'View and manage your emails and SMS messages in one place.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
