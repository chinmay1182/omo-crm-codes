import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Appointment Slots - Appointment & Scheduling',
    description: 'Manage appointment slots and availability.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
