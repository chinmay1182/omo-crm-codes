import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Form Editor - Form Management & Builder',
    description: 'Edit and manage your form.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
