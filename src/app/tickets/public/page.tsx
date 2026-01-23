
'use client';

import { useState, useEffect } from 'react';
import styles from './styles.module.css';

export default function PublicTicketPage() {
    const [formData, setFormData] = useState({
        subject: '',
        category: '',
        description: '',
        contact_name: '',
        contact_email: '',
        contact_phone: ''
    });
    const [categories, setCategories] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ticketData, setTicketData] = useState<any>(null);
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        // Fetch branding
        fetch('/api/public/branding')
            .then(res => res.json())
            .then(data => {
                if (data.logoUrl) setLogoUrl(data.logoUrl);
            })
            .catch(e => console.error("Could not load branding", e));

        // Fetch categories directly from the public settings endpoint (we need to ensure settings are readable)
        // If we haven't made a public settings endpoint, we can try the main settings one if we opened RLS
        fetch('/api/tickets/settings')
            .then(res => res.json())
            .then(data => {
                if (data.categories) setCategories(data.categories);
                if (data.subjects) setSubjects(data.subjects);
            })
            .catch(e => console.error("Could not load settings", e));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/public/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setTicketData(data);
                setSubmitted(true);
            } else {
                setError(data.error || 'Failed to submit ticket. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.container}>
                <div className={styles.successMessage}>
                    <div className={styles.successIcon}>✓</div>
                    <h2>Ticket Submitted Successfully!</h2>
                    {ticketData && (
                        <p style={{ fontSize: '1.2rem', color: '#1e293b', margin: '0.5rem 0', fontWeight: 'bold' }}>
                            Ticket Number: {ticketData.ticket_number || ticketData.ticket_id || ticketData.display_id || ticketData.id}
                        </p>
                    )}
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>
                        Thank you for contacting us. We have received your ticket and will get back to you shortly.
                    </p>
                    <button
                        onClick={() => {
                            setSubmitted(false);
                            setFormData({ subject: '', category: '', description: '', contact_name: '', contact_email: '', contact_phone: '' });
                        }}
                        className={styles.submitButton}
                        style={{ marginTop: '2rem', width: 'auto', padding: '10px 24px' }}
                    >
                        Submit Another Ticket
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '20px', background: '#f1f5f9' }}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        {logoUrl && (
                            <img
                                src={logoUrl}
                                alt="ConsoLegal"
                                style={{
                                    maxWidth: '200px',
                                    height: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                    </div>
                    <h1 className={styles.title}>Submit a Support Ticket</h1>
                    <p className={styles.subtitle}>Fill out the form below and our team will assist you.</p>
                </div>

                {error && (
                    <div style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Your Name</label>
                        <input
                            required
                            className={styles.input}
                            name="contact_name"
                            placeholder="John Doe"
                            value={formData.contact_name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email Address</label>
                        <input
                            required
                            type="email"
                            className={styles.input}
                            name="contact_email"
                            placeholder="john@example.com"
                            value={formData.contact_email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Phone Number (Optional)</label>
                        <input
                            className={styles.input}
                            name="contact_phone"
                            placeholder="+1234567890"
                            value={formData.contact_phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <select
                            required
                            className={styles.select}
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                        >
                            <option value="">Select a category</option>
                            {categories.map((c: any) => (
                                <option key={c.id} value={c.value}>{c.value}</option>
                            ))}
                            {categories.length === 0 && (
                                <option disabled>No categories available</option>
                            )}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Issue Subject</label>
                        <select
                            required
                            className={styles.select}
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                        >
                            <option value="">Select a subject</option>
                            {subjects.map((s: any) => (
                                <option key={s.id} value={s.value}>{s.value}</option>
                            ))}
                            {subjects.length === 0 && (
                                <option disabled>No subjects available</option>
                            )}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Please describe your issue and the category you are facing</label>
                        <textarea
                            required
                            className={styles.textarea}
                            name="description"
                            placeholder="Please provide as much detail as possible so we can help you faster..."
                            value={formData.description}
                            onChange={handleChange}
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                            Note: Please include specific details like error messages, steps to reproduce, or invoice numbers if applicable.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '12px', color: '#94a3b8' }}>
                    Protected by Consolegal Secure Form
                </div>
            </div>
        </div>
    );
}
