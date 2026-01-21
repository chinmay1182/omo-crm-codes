'use client';

import React, { useState, useEffect } from 'react';
import styles from './ContactEmails.module.css'; // We'll create this or use inline/generic styles

interface Email {
    id: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    snippet: string;
    type: 'sent' | 'received';
}

interface ContactEmailsProps {
    contactId: string;
    contactEmail?: string;
}

export default function ContactEmails({ contactId, contactEmail }: ContactEmailsProps) {
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (contactEmail) {
            fetchEmails();
        }
    }, [contactId, contactEmail]);

    const fetchEmails = async () => {
        setLoading(true);
        setError('');
        try {
            // Placeholder API call - we need to implement the backend
            const res = await fetch(`/api/contacts/${contactId}/emails`);
            if (res.ok) {
                const data = await res.json();
                setEmails(data || []);
            } else {
                setEmails([]);
            }

        } catch (err: any) {
            setError(err.message || 'Failed to load emails');
        } finally {
            setLoading(false);
        }
    };

    if (!contactEmail) {
        return <div style={{ padding: '20px', color: '#666' }}>No email address associated with this contact.</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Emails</h3>

            </div>

            {loading && <div>Loading emails...</div>}

            {!loading && emails.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
                    <i className="fa-light fa-envelope" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                    <p>No emails found.</p>
                </div>
            )}

            {!loading && emails.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {emails.map(email => (
                        <div key={email.id} style={{ padding: '12px', border: '1px solid #e9ecef', borderRadius: '4px', background: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600 }}>{email.from}</span>
                                <span style={{ fontSize: '12px', color: '#999' }}>{new Date(email.date).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>{email.subject}</div>
                            <div style={{ fontSize: '14px', color: '#666' }}>{email.snippet}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
