import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Form Builder - Custom Forms & Surveys',
    description: 'Create and manage custom forms and surveys to collect data and insights from your customers.',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
