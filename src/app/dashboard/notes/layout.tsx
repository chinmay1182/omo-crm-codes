import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Quick Notes - Notes & Reminders',
    description: 'Create, manage, and organize quick notes and reminders to stay on top of important tasks and deadlines.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
