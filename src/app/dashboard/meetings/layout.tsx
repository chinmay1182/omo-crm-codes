import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Meeting Logs - Meeting & Call Recordings',
    description: 'View and manage your meeting logs.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
