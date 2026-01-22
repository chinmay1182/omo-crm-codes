import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Task Manager - Task Management & Tracking',
    description: 'Manage and track your tasks.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
