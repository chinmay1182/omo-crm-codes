'use client';

import React, { useState, useEffect } from 'react';

interface WhatsAppMessage {
    id: string;
    direction: 'inbound' | 'outbound';
    message: string;
    timestamp: string;
    status: string;
}

interface ContactWhatsAppProps {
    contactId: string;
    contactPhone?: string;
    contactMobile?: string;
}

export default function ContactWhatsApp({ contactId, contactPhone, contactMobile }: ContactWhatsAppProps) {
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');

    const targetNumber = contactMobile || contactPhone;

    useEffect(() => {
        if (targetNumber) {
            fetchMessages();
        }
    }, [contactId, targetNumber]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            // Use contact-based API endpoint for better mapping
            const res = await fetch(`/api/contacts/${contactId}/whatsapp`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data || []);
            } else {
                // Fallback to phone-based API if contact-based fails
                if (targetNumber) {
                    const fallbackRes = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(targetNumber)}`);
                    if (fallbackRes.ok) {
                        const data = await fallbackRes.json();
                        setMessages(data || []);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching WhatsApp messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        // Logic to send message via API
        alert('Send functionality coming soon');
        setNewMessage('');
    };

    if (!targetNumber) {
        return <div style={{ padding: '20px', color: '#666' }}>No mobile number associated with this contact.</div>;
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>WhatsApp</h3>
            </div>

            <div style={{
                flex: 1,
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                background: '#e5ddd5',
                overflow: 'hidden', // Ensure inner content stays within bounds
                minHeight: '400px' // Fallback minimum height
            }}>
                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    padding: '16px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                            <p>No messages yet.</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div
                                key={msg.id}
                                style={{
                                    alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                                    background: msg.direction === 'outbound' ? '#dcf8c6' : 'white',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    maxWidth: '70%',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div>{msg.message}</div>
                                <div style={{ fontSize: '10px', color: '#999', textAlign: 'right', marginTop: '4px' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}
