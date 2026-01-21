"use client";

import React from "react";

export default function Page() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70vh',
            textAlign: 'center',
            color: '#666'
        }}>
            <i className="fa-sharp fa-thin fa-comment-dots" style={{ fontSize: '48px', marginBottom: '20px', color: '#ccc' }}></i>
            <h2 style={{ fontSize: '24px', fontWeight: 300, marginBottom: '10px' }}>WhatsApp Chats Coming Soon</h2>
            <p style={{ maxWidth: '400px', lineHeight: '1.5' }}>
                We are currently working on integrating advanced WhatsApp features. Stay tuned for updates!
            </p>
        </div>
    );
}