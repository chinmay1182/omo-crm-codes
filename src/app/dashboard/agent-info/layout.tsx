import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'User Profile - User Management & Permissions',
    description: 'View and manage your user profile.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
