'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '../styles.module.css';
import scrollStyles from '../scroll.module.css';
import modalStyles from './modal.module.css';
import toast from 'react-hot-toast';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    created_at: string;
}

export default function TicketFAQsPage() {
    const router = useRouter();
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
    const [formData, setFormData] = useState({
        question: '',
        answer: '',
        category: ''
    });

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        try {
            const res = await fetch('/api/tickets/faqs');
            if (res.ok) {
                const data = await res.json();
                setFaqs(data);
            }
        } catch (error) {
            console.error('Failed to fetch FAQs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingFaq ? `/api/tickets/faqs/${editingFaq.id}` : '/api/tickets/faqs';
            const method = editingFaq ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingFaq ? 'FAQ updated!' : 'FAQ created!');
                setShowModal(false);
                setEditingFaq(null);
                setFormData({ question: '', answer: '', category: '' });
                fetchFAQs();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to save FAQ');
            }
        } catch (error) {
            toast.error('An error occurred');
        }
    };

    const handleEdit = (faq: FAQ) => {
        setEditingFaq(faq);
        setFormData({
            question: faq.question,
            answer: faq.answer,
            category: faq.category || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this FAQ?')) return;

        try {
            const res = await fetch(`/api/tickets/faqs/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('FAQ deleted!');
                fetchFAQs();
            } else {
                toast.error('Failed to delete FAQ');
            }
        } catch (error) {
            toast.error('An error occurred');
        }
    };

    const openModal = () => {
        setEditingFaq(null);
        setFormData({ question: '', answer: '', category: '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingFaq(null);
        setFormData({ question: '', answer: '', category: '' });
    };

    return (
        <div className={styles.container} style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <header className={styles.header}>
                <h1>Ticket FAQs</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => router.push('/dashboard/tickets')}
                        className={styles.actionButton}
                    >
                        Back to Tickets
                    </button>
                    <button
                        onClick={openModal}
                        className={styles.actionButton}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#11a454', color: 'white' }}
                    >
                        <i className="fa-regular fa-plus"></i>
                        Add FAQ
                    </button>
                </div>
            </header>

            {/* Modal */}
            {showModal && (
                <div className={modalStyles.modalOverlay} onClick={closeModal}>
                    <div className={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={modalStyles.modalHeader}>
                            <h2 className={modalStyles.modalTitle}>
                                {editingFaq ? 'Edit FAQ' : 'New FAQ'}
                            </h2>
                            <button className={modalStyles.closeButton} onClick={closeModal}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={modalStyles.formGroup}>
                                <label className={modalStyles.label}>Category (Optional)</label>
                                <input
                                    type="text"
                                    className={modalStyles.input}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Technical, Billing, General"
                                />
                            </div>

                            <div className={modalStyles.formGroup}>
                                <label className={modalStyles.label}>Question *</label>
                                <input
                                    type="text"
                                    className={modalStyles.input}
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                    required
                                    placeholder="Enter the question"
                                />
                            </div>

                            <div className={modalStyles.formGroup}>
                                <label className={modalStyles.label}>Answer *</label>
                                <textarea
                                    className={modalStyles.textarea}
                                    value={formData.answer}
                                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                    required
                                    placeholder="Enter the answer"
                                />
                            </div>

                            <div className={modalStyles.buttonGroup}>
                                <button
                                    type="button"
                                    className={modalStyles.cancelButton}
                                    onClick={closeModal}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={modalStyles.submitButton}>
                                    {editingFaq ? 'Update FAQ' : 'Create FAQ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }} className={scrollStyles.noScrollbar}>
                <div className={styles.tableContainer}>
                    <h2 className={styles.tableTitle}>All FAQs</h2>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                        </div>
                    ) : faqs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                            <Image
                                src="/pngegg.png"
                                alt="No FAQs"
                                width={120}
                                height={120}
                                style={{ marginBottom: '16px' }}
                            />
                            <p style={{ fontSize: '20px', fontWeight: '300', marginBottom: '10px', color: '#666' }}>No FAQs Found</p>
                            <p style={{ fontSize: '16px', marginTop: '4px', fontWeight: '300', color: '#666' }}>Create one to get started!</p>
                        </div>
                    ) : (
                        <div style={{ padding: '20px' }}>
                            {faqs.map((faq) => (
                                <div
                                    key={faq.id}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        marginBottom: '15px',
                                        background: '#fff'
                                    }}
                                >
                                    {faq.category && (
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                background: '#dbeafe',
                                                color: '#1e40af',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                marginBottom: '8px'
                                            }}
                                        >
                                            {faq.category}
                                        </span>
                                    )}
                                    <h3 style={{ margin: '8px 0', fontSize: '16px', fontWeight: 600 }}>
                                        {faq.question}
                                    </h3>
                                    <p style={{ margin: '8px 0', color: '#64748b', lineHeight: '1.6' }}>
                                        {faq.answer}
                                    </p>
                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEdit(faq)}
                                            className={styles.actionButton}
                                            style={{ fontSize: '12px', padding: '4px 12px' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(faq.id)}
                                            className={styles.deleteButton}
                                            style={{ fontSize: '12px', padding: '4px 12px' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB for Create FAQ */}
            <button
                onClick={openModal}
                className={styles.fab}
                title="Add FAQ"
                style={{ zIndex: 9999 }}
            >
                <i className="fa-light fa-plus"></i>
            </button>
        </div>
    );
}
