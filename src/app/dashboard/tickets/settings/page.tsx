
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles.module.css'; // Reusing dashboard styles for consistency
import toast from 'react-hot-toast';

export default function TicketSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState({
        subjects: [],
        categories: [],
        sources: []
    });
    const [loading, setLoading] = useState(true);

    // New setting state
    const [newSettingType, setNewSettingType] = useState('subject');
    const [newValue, setNewValue] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/tickets/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSetting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newValue.trim()) return;

        setAdding(true);
        try {
            const res = await fetch('/api/tickets/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setting_type: newSettingType,
                    value: newValue.trim()
                })
            });

            if (res.ok) {
                toast.success('Setting added successfully');
                setNewValue('');
                fetchSettings();
            } else {
                toast.error('Failed to add setting');
            }
        } catch (error) {
            toast.error('Error adding setting');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteSetting = async (id: string, type: string) => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

        try {
            const res = await fetch(`/api/tickets/settings?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Setting deleted!');
                fetchSettings();
            } else {
                toast.error('Failed to delete setting');
            }
        } catch (error) {
            toast.error('Error deleting setting');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Ticket Settings</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => router.push('/dashboard/tickets/faqs')}
                        className={styles.actionButton}
                    >
                        <i className="fa-regular fa-circle-question"></i> FAQs
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/tickets')}
                        className={styles.actionButton}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                {/* Add New Setting Card */}
                <div className={styles.tableContainer} style={{ gridColumn: '1 / -1' }}>
                    <h2 className={styles.tableTitle} style={{ marginBottom: '1rem' }}>Add New Option</h2>
                    <form onSubmit={handleAddSetting} style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                            <select
                                value={newSettingType}
                                onChange={(e) => setNewSettingType(e.target.value)}
                                className={styles.select}
                                style={{ width: '100%' }}
                            >
                                <option value="subject">Subject</option>
                                <option value="category">Category</option>
                                <option value="source">Source</option>
                            </select>
                        </div>
                        <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Value Name</label>
                            <input
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className={styles.select} // reusing input style
                                style={{ width: '100%' }}
                                placeholder="E.g. Technical Support, Website, etc."
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.createButton}
                            disabled={adding}
                        >
                            {adding ? 'Adding...' : 'Add Option'}
                        </button>
                    </form>
                </div>

                {/* Display Lists */}
                <div className={styles.tableContainer} style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                    <h2 className={styles.tableTitle} style={{ marginBottom: '1rem' }}>Public Ticket Submission Link</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', fontSize: '14px', color: '#64748b' }}>Direct Link</p>
                            <code style={{ background: '#fff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'block', wordBreak: 'break-all', fontSize: '13px' }}>
                                {typeof window !== 'undefined' ? `${window.location.origin}/tickets/public` : '/tickets/public'}
                            </code>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <a
                                href="/tickets/public"
                                target="_blank"
                                className={styles.actionButton}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                            >
                                <i className="fa-regular fa-arrow-up-right-from-square"></i>
                                Open Form
                            </a>

                            <button
                                onClick={() => {
                                    const link = typeof window !== 'undefined' ? `${window.location.origin}/tickets/public` : '';
                                    navigator.clipboard.writeText(link);
                                    toast.success('Link copied to clipboard!');
                                }}
                                className={styles.actionButton}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <i className="fa-regular fa-copy"></i>
                                Copy Link
                            </button>

                            <button
                                onClick={() => {
                                    const link = typeof window !== 'undefined' ? `${window.location.origin}/tickets/public` : '';
                                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent('Submit a support ticket: ' + link)}`;
                                    window.open(whatsappUrl, '_blank');
                                }}
                                className={styles.actionButton}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', borderColor: '#25D366' }}
                            >
                                <i className="fa-brands fa-whatsapp"></i>
                                Share on WhatsApp
                            </button>

                            <button
                                onClick={() => {
                                    const link = typeof window !== 'undefined' ? `${window.location.origin}/tickets/public` : '';
                                    const subject = 'Submit a Support Ticket';
                                    const body = `You can submit a support ticket using this link:\n\n${link}`;
                                    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                }}
                                className={styles.actionButton}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <i className="fa-regular fa-envelope"></i>
                                Share via Email
                            </button>

                            <button
                                onClick={() => {
                                    const link = typeof window !== 'undefined' ? `${window.location.origin}/tickets/public` : '';
                                    // Generate QR code using a simple API
                                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
                                    window.open(qrUrl, '_blank');
                                }}
                                className={styles.actionButton}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <i className="fa-regular fa-qrcode"></i>
                                Generate QR Code
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h3 className={styles.statTitle} style={{ fontSize: '16px' }}>Subjects</h3>
                    </div>
                    <ul style={{ paddingLeft: '0', marginTop: '0', color: '#334155', listStyle: 'none' }}>
                        {settings.subjects.map((s: any) => (
                            <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                                <span>{s.value}</span>
                                <button
                                    onClick={() => handleDeleteSetting(s.id, 'subject')}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}
                                    title="Delete"
                                >
                                    <i className="fa-regular fa-trash"></i>
                                </button>
                            </li>
                        ))}
                        {settings.subjects.length === 0 && <li style={{ padding: '8px 12px', color: '#94a3b8' }}>No custom subjects</li>}
                    </ul>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h3 className={styles.statTitle} style={{ fontSize: '16px' }}>Categories</h3>
                    </div>
                    <ul style={{ paddingLeft: '0', marginTop: '0', color: '#334155', listStyle: 'none' }}>
                        {settings.categories.map((c: any) => (
                            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                                <span>{c.value}</span>
                                <button
                                    onClick={() => handleDeleteSetting(c.id, 'category')}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}
                                    title="Delete"
                                >
                                    <i className="fa-regular fa-trash"></i>
                                </button>
                            </li>
                        ))}
                        {settings.categories.length === 0 && <li style={{ padding: '8px 12px', color: '#94a3b8' }}>No custom categories</li>}
                    </ul>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h3 className={styles.statTitle} style={{ fontSize: '16px' }}>Sources</h3>
                    </div>
                    <ul style={{ paddingLeft: '0', marginTop: '0', color: '#334155', listStyle: 'none' }}>
                        {settings.sources.map((s: any) => (
                            <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                                <span>{s.value}</span>
                                <button
                                    onClick={() => handleDeleteSetting(s.id, 'source')}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}
                                    title="Delete"
                                >
                                    <i className="fa-regular fa-trash"></i>
                                </button>
                            </li>
                        ))}
                        {settings.sources.length === 0 && <li style={{ padding: '8px 12px', color: '#94a3b8' }}>No custom sources</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
}
