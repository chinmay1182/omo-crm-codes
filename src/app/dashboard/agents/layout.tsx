import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Manage Agents - Agent Management & Permissions',
    description: 'Manage agents and their permissions.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
