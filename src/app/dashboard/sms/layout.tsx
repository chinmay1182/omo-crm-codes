import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'WhatsApp Chats - Customer Messaging & Conversations',
    description: 'Manage, track, and respond to customer WhatsApp conversations in one place. Streamline communication and improve response times.',
};


export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
