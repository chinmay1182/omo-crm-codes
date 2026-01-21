'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import styles from './styles.module.css';
import toast from 'react-hot-toast';

export default function FormBuilderList() {
    const { user } = useAuth();
    const router = useRouter();
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        visits: 0,
        submissions: 0
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFormName, setNewFormName] = useState('');
    const [newFormDesc, setNewFormDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchForms();
        }
    }, [user]);

    const fetchForms = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/forms?userId=${user.id}`);
            const data = await res.json();
            if (res.ok) {
                setForms(data);
                // Calculate stats
                const visits = data.reduce((acc: number, f: any) => acc + (f.visits || 0), 0);
                const submissions = data.reduce((acc: number, f: any) => acc + (f.submissions || 0), 0);
                setStats({ visits, submissions });
            } else {
                toast.error('Failed to load forms');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading forms');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteForm = async (e: React.MouseEvent, formId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this form?')) return;

        try {
            const res = await fetch(`/api/forms/${formId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Form deleted successfully');
                setForms(forms.filter(f => f.id !== formId));
            } else {
                toast.error('Failed to delete form');
            }
        } catch (error) {
            toast.error('Error deleting form');
        }
    };

    const handleCreateForm = async () => {
        if (!newFormName.trim()) {
            toast.error('Please enter a form name');
            return;
        }

        try {
            setCreating(true);
            const res = await fetch('/api/forms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newFormName,
                    description: newFormDesc,
                    userId: user.id
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Form created!');
                setIsModalOpen(false);
                setNewFormName('');
                setNewFormDesc('');
                // Redirect to builder
                router.push(`/dashboard/form-builder/${data.id}`);
            } else {
                toast.error(data.error || 'Failed to create form');
            }
        } catch (error) {
            toast.error('Error creating form');
        } finally {
            setCreating(false);
        }
    };

    if (!user) return <div className="p-4">Loading user...</div>;

    return (
        <div className={styles.container}>
            {/* Top Navigation Bar */}
            <div className={styles.topNav}>
                <div className={styles.navTabsContainer}>
                    <div className={`${styles.navTab} ${styles.active}`}>
                        All Forms
                    </div>
                </div>

                <div className={styles.topActions}>
                    {/* Add any additional action buttons here if needed */}
                </div>
            </div>

            {/* Content Area */}
            <div className={styles.contentArea}>
                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <p className={styles.statTitle}>Total Forms</p>
                        <p className={styles.statValue}>{forms.length}</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statTitle}>Total Submissions</p>
                        <p className={styles.statValue}>{stats.submissions}</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statTitle}>Total Visits</p>
                        <p className={styles.statValue}>{stats.visits}</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statTitle}>Conversion Rate</p>
                        <p className={styles.statValue}>
                            {stats.visits > 0 ? ((stats.submissions / stats.visits) * 100).toFixed(1) : '0'}%
                        </p>
                    </div>
                </div>

                {/* Forms Grid */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <h2 className={styles.tableTitle}>Your Forms</h2>
                    </div>

                    <div className={styles.formsGrid}>
                        {loading ? (
                            <div className={styles.loading}>Loading forms...</div>
                        ) : forms.length === 0 ? (
                            <div className={styles.empty}>
                                You haven't created any forms yet. Click the + button to get started.
                            </div>
                        ) : (
                            forms.map((form) => (
                                <div
                                    key={form.id}
                                    className={styles.formCard}
                                    onClick={() => router.push(`/dashboard/form-builder/${form.id}`)}
                                >
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <div className={styles.formName} title={form.name}>{form.name}</div>
                                            <div className={styles.formDate}>
                                                {new Date(form.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className={`${styles.badge} ${form.published ? styles.badgePublished : styles.badgeDraft}`}>
                                            {form.published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <div className={styles.cardBody}>
                                        {form.description || 'No description'}
                                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                                            <i className="fa fa-eye" style={{ marginRight: '4px' }}></i> {form.visits}
                                            <i className="fa fa-file-arrow-up" style={{ marginLeft: '12px', marginRight: '4px' }}></i> {form.submissions}
                                        </div>
                                    </div>
                                    <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                                        <Link href={`/dashboard/form-builder/${form.id}`} className={styles.editButton}>
                                            Edit
                                        </Link>

                                        {form.published && (
                                            <Link href={`/f/${form.share_url}`} target="_blank" className={styles.viewButton}>
                                                View
                                            </Link>
                                        )}

                                        <button
                                            className={styles.deleteButton}
                                            onClick={(e) => handleDeleteForm(e, form.id)}
                                            title="Delete Form"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FAB for Create Form */}
            <button
                onClick={() => setIsModalOpen(true)}
                className={styles.fab}
                title="Create New Form"
            >
                <i className="fa-light fa-plus"></i>
            </button>

            {/* Create Form Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Create New Form</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={styles.closeButton}
                            >
                                <i className="fa-light fa-times"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Form Name</label>
                                <input
                                    type="text"
                                    value={newFormName}
                                    onChange={(e) => setNewFormName(e.target.value)}
                                    placeholder="Enter form name"
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Description (Optional)</label>
                                <textarea
                                    value={newFormDesc}
                                    onChange={(e) => setNewFormDesc(e.target.value)}
                                    placeholder="Enter form description"
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={styles.cancelBtn}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateForm}
                                disabled={creating}
                                className={styles.saveBtn}
                            >
                                {creating ? (
                                    <>
                                        <i className="fa fa-spinner fa-spin"></i> Creating...
                                    </>
                                ) : (
                                    'Create Form'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
