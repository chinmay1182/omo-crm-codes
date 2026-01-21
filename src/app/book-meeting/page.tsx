
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function BookMeetingPage() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        client_name: '',
        client_email: '',
        title: '',
        preferred_date: '',
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/meetings/public-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success('Request Sent Successfully');
            } else {
                toast.error('Failed to send request');
            }
        } catch (e) {
            toast.error('Error submitting form');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
                    <div style={{ fontSize: '48px', color: '#15426d', marginBottom: '16px' }}>
                        <i className="fa-light fa-calendar-check"></i>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Request Received</h1>
                    <p style={{ color: '#666', lineHeight: '1.6' }}>
                        Thank you, <strong>{formData.client_name}</strong>. We have received your meeting request.
                        Our team will review it and send a confirmation email significantly soon.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: '600px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {/* Logo Placeholder - You can uncomment if needed */}
                    {/* <img src="/consolegal.jpeg" alt="Logo" style={{height: '60px', marginBottom: '16px'}} /> */}
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a' }}>Book a Meeting</h1>
                    <p style={{ color: '#666' }}>Schedule a consultation or follow-up with us.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 500, fontSize: '14px' }}>Your Name</label>
                        <input required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }}
                            value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="John Doe" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 500, fontSize: '14px' }}>Email Address</label>
                        <input required type="email" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }}
                            value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} placeholder="john@example.com" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 500, fontSize: '14px' }}>Meeting Topic</label>
                        <input required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }}
                            value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Legal Consultation" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 500, fontSize: '14px' }}>Preferred Date & Time</label>
                        <input required type="datetime-local" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }}
                            value={formData.preferred_date} onChange={e => setFormData({ ...formData, preferred_date: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 500, fontSize: '14px' }}>Additional Notes</label>
                        <textarea rows={4} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }}
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Briefly describe what you'd like to discuss..." />
                    </div>

                    <button type="submit" disabled={loading} style={{
                        marginTop: '10px',
                        background: '#15426d',
                        color: 'white',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}>
                        {loading ? 'Sending Request...' : 'Request Meeting'}
                    </button>
                </form>
            </div>
        </div>
    );
}
