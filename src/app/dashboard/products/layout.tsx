import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Products - Products & Quotations',
    description: 'Manage your products inventory and handle client quotations efficiently.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
