import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Client Contacts - Customer Data & Relationship Management',
    description: 'Store, manage, and organize client contact information in one centralized place to build stronger customer relationships.',
};


export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
