import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard - Business Overview',
    description: 'Get a complete overview of your business performance, leads, tasks, and activities in one centralized dashboard.',
};


export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
