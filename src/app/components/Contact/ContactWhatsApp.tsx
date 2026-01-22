'use client';

import React from 'react';
import Image from 'next/image';

interface ContactWhatsAppProps {
    contactId: string;
    contactPhone?: string;
    contactMobile?: string;
}

export default function ContactWhatsApp({
    contactPhone,
    contactMobile
}: ContactWhatsAppProps) {
    const targetNumber = contactMobile || contactPhone;

    if (!targetNumber) {
        return (
            <div style={{ padding: '20px', color: '#666' }}>
                No mobile number associated with this contact.
            </div>
        );
    }

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    maxWidth: '360px',
                    width: '100%'
                }}
            >
                {/* Illustration */}
                <div style={{ marginBottom: '20px' }}>
                    <Image
                        src="/illustration (4).png"
                        alt="WhatsApp Coming Soon"
                        width={260}
                        height={260}
                        style={{ margin: '0 auto' }}
                    />
                </div>

                {/* Text */}
                <h3
                    style={{
                        fontSize: '20px',
                        fontWeight: 300,
                        color: '#334155',
                        marginBottom: '8px'
                    }}
                >
                    WhatsApp Chats Coming Soon
                </h3>

                <p
                    style={{
                        fontSize: '15px',
                        lineHeight: 1.6,
                        color: '#64748b',
                        fontWeight: 300
                    }}
                >
                    We are currently working on integrating advanced WhatsApp features.
                    Stay tuned for updates!
                </p>
            </div>
        </div>
    );
}
