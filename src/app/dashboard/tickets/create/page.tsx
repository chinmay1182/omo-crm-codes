
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './formStyles.module.css';
import toast from 'react-hot-toast';

export default function CreateTicketPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        subject: '',
        category: '',
        source: '',
        priority: 'Medium',
        sla_policy: 'SLA-1',
        description: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        assigned_to: '' // Empty means unassigned
    });

    const [settings, setSettings] = useState({
        subjects: [],
        categories: [],
        sources: []
    });

    const [agents, setAgents] = useState<Array<{ id: string, username: string, email: string }>>([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchAgents();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/tickets/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents');
            if (res.ok) {
                const data = await res.json();
                // API returns { agents: [...] }, not just an array
                setAgents(Array.isArray(data.agents) ? data.agents : []);
            } else {
                setAgents([]);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
            setAgents([]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Ticket created successfully!');
                router.push('/dashboard/tickets');
            } else {
                const error = await res.json();
                toast.error(error.message || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Create New Ticket</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    {/* Contact Information */}
                    <div className={styles.fullWidth}>
                        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#334155' }}>Contact Information</h3>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contact Name</label>
                        <input
                            className={styles.input}
                            name="contact_name"
                            value={formData.contact_name}
                            onChange={handleChange}
                            placeholder="Enter contact name"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contact Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contact Phone</label>
                        <input
                            className={styles.input}
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleChange}
                            placeholder="+123..."
                        />
                    </div>

                    {/* Ticket Details */}
                    <div className={styles.fullWidth}>
                        <h3 style={{ fontSize: '16px', marginBottom: '10px', marginTop: '10px', color: '#334155' }}>Ticket Details</h3>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Subject</label>
                        <select
                            className={styles.select}
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Subject</option>
                            {settings.subjects.map((s: any) => (
                                <option key={s.id} value={s.value}>{s.value}</option>
                            ))}
                            {settings.subjects.length === 0 && (
                                <option disabled>No subjects available</option>
                            )}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <select
                            className={styles.select}
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                        >
                            <option value="">Select Category</option>
                            {settings.categories.map((c: any) => (
                                <option key={c.id} value={c.value}>{c.value}</option>
                            ))}
                            {/* Fallback if no settings */}
                            {settings.categories.length === 0 && (
                                <>
                                    <option value="Technical">Technical</option>
                                    <option value="Billing">Billing</option>
                                    <option value="Product">Product</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Source</label>
                        <select
                            className={styles.select}
                            name="source"
                            value={formData.source}
                            onChange={handleChange}
                        >
                            <option value="">Select Source</option>
                            {settings.sources.map((s: any) => (
                                <option key={s.id} value={s.value}>{s.value}</option>
                            ))}
                            {settings.sources.length === 0 && (
                                <>
                                    <option value="Email">Email</option>
                                    <option value="Phone">Phone</option>
                                    <option value="Web">Web</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Priority</label>
                        <select
                            className={styles.select}
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>SLA Policy</label>
                        <select
                            className={styles.select}
                            name="sla_policy"
                            value={formData.sla_policy}
                            onChange={handleChange}
                        >
                            <option value="SLA-1">SLA-1 (4 hrs)</option>
                            <option value="SLA-2">SLA-2 (24 hrs)</option>
                            <option value="SLA-3">SLA-3 (72 hrs)</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Assign To</label>
                        <select
                            className={styles.select}
                            name="assigned_to"
                            value={formData.assigned_to}
                            onChange={handleChange}
                        >
                            <option value="">Keep Unassigned</option>
                            {agents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.username} ({agent.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Description</label>
                        <textarea
                            className={styles.textarea}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe the issue..."
                        />
                    </div>
                </div>

                <div className={styles.buttonGroup}>
                    <button
                        type="button"
                        className={`${styles.button} ${styles.secondaryButton}`}
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.primaryButton}`}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Ticket'}
                    </button>
                </div>
            </form>
        </div>
    );
}
