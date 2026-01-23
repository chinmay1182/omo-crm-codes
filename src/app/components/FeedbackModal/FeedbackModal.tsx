'use client';

import React, { useState } from 'react';
import styles from './FeedbackModal.module.css';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    companyDetails: any;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    user,
    companyDetails
}) => {
    const [formData, setFormData] = useState({
        title: '',
        type: 'bug',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Please enter a title');
            return;
        }

        if (!formData.description.trim()) {
            toast.error('Please enter a description');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                agent_id: user?.id,
                agent_name: user?.full_name || user?.username || user?.email,
                company_name: companyDetails?.company_name || user?.company_name || 'Unknown',
                company_email: companyDetails?.company_email || user?.email,
                company_phone: companyDetails?.company_phone || user?.phone_number
            };

            const response = await fetch('/api/developer-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit feedback');
            }

            toast.success('Feedback submitted successfully');
            onClose();
            setFormData({ title: '', type: 'bug', description: '' });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Developer Feedback</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <i className="fa-light fa-xmark"></i>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    <div className={styles.formGrid}>

                        <div className={styles.formGroup}>
                            <label>Feedback Type *</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className={styles.select}
                                required
                            >
                                <option value="bug">Report a Bug</option>
                                <option value="feature">Request a Feature</option>
                                <option value="improvement">Improvement</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Title / Summary *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Brief summary of the issue or idea"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Description *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className={styles.textarea}
                                placeholder="Detailed description. For bugs, please include steps to reproduce."
                                required
                            />
                        </div>

                    </div>

                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
