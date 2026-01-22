import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Service List - Manage Offered Services',
    description: 'View, organize, and manage all services you offer in one place for better visibility and operational clarity.',
};


export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
