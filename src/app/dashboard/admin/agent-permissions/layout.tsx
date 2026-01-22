import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agent Permissions - Agent Management & Permissions',
    description: 'Manage agent permissions and roles.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
