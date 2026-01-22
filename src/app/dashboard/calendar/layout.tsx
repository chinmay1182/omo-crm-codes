import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Global Calendar - Calendar & Scheduling',
    description: 'View your global calendar and schedule.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
