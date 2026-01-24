import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pingback Monitor - Real-time Call Events',
    description: 'Monitor, test, and analyze real-time pingback events and connectivity status.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
