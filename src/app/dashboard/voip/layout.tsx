import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'VoIP Dialer - Call Management & Sales Calling',
    description: 'Make, receive, and manage customer calls directly from Omo CRM. Track call history, manage contacts, and improve sales productivity with the built-in VoIP dialer.',
};


export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
