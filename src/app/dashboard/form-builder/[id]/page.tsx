
'use client';

import React, { useEffect, useState } from 'react';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useRouter, useParams } from 'next/navigation';
import DesignerContextProvider, { DesignerContext } from '../_context';
import Designer from '../_components/Designer';
import FormResponses from '../_components/FormResponses';
import styles from '../_components/builder.module.css';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function BuilderPage() {
    const params = useParams(); // Using useParams() instead of props because it is a client component in App Dir
    const id = params?.id as string;

    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const fetchForm = async () => {
                try {
                    const res = await fetch(`/api/forms/${id}`);
                    const data = await res.json();
                    if (res.ok) {
                        setForm(data);
                    } else {
                        toast.error('Form not found');
                    }
                } catch (error) {
                    toast.error('Error loading form');
                } finally {
                    setLoading(false);
                }
            };
            fetchForm();
        }
    }, [id]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading form...</p>
            </div>
        );
    }

    if (!form) return <div className={styles.loadingContainer}><p>Form not found</p></div>;

    return (
        <DesignerContextProvider>
            <FormBuilder form={form} />
        </DesignerContextProvider>
    );
}

function FormBuilder({ form }: { form: any }) {
    const { setElements, elements } = React.useContext(DesignerContext)!;
    const [isReady, setIsReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [published, setPublished] = useState(form.published);
    const [activeTab, setActiveTab] = useState<'builder' | 'responses'>('builder');

    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 10,
        },
    });

    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 300,
            tolerance: 5,
        },
    });

    const sensors = useSensors(mouseSensor, touchSensor);

    useEffect(() => {
        if (isReady) return;
        // Load elements from JSON
        const loadedElements = JSON.parse(form.content || '[]');
        setElements(loadedElements);
        setIsReady(true);
    }, [form, setElements, isReady]);

    if (!isReady) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Initializing...</p>
            </div>
        );
    }

    const saveForm = async () => {
        try {
            setSaving(true);
            const content = JSON.stringify(elements);
            const res = await fetch(`/api/forms/${form.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (res.ok) {
                toast.success('Form saved successfully');
            } else {
                toast.error('Failed to save');
            }
        } catch (e) {
            toast.error('Error saving form');
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async () => {
        try {
            const newPublishedState = !published;
            const res = await fetch(`/api/forms/${form.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ published: newPublishedState }),
            });

            if (res.ok) {
                setPublished(newPublishedState);
                toast.success(newPublishedState ? 'Form Published' : 'Form Unpublished');
            } else {
                toast.error('Failed to update status');
            }
        } catch (e) {
            toast.error('Error updating status');
        }
    };

    // Ensure that we are on client before rendering DndContext to avoid hydration mismatch if any
    // but 'use client' is at top so it is fine.

    const shareUrl = `${window.location.origin}/f/${form.share_url}`;

    return (
        <DndContext sensors={sensors}>
            <div className={styles.builderContainer}>
                {/* Top Navigation Bar */}
                <div className={styles.topNav}>
                    <div className={styles.navLeft}>
                        <Link href="/dashboard/form-builder" className={styles.backButton}>
                            <i className="fa-light fa-arrow-left"></i>
                        </Link>
                        <div className={styles.formInfo}>
                            <h2 className={styles.formTitle}>{form.name}</h2>
                            <span className={styles.formStatus}>
                                {published ? 'Published' : 'Draft'}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.navTabsContainer}>
                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`${styles.navTab} ${activeTab === 'builder' ? styles.active : ''}`}
                        >
                            Builder
                        </button>
                        <button
                            onClick={() => setActiveTab('responses')}
                            className={`${styles.navTab} ${activeTab === 'responses' ? styles.active : ''}`}
                        >
                            Responses
                        </button>
                    </div>

                    <div className={styles.navActions}>
                        <button
                            className={styles.previewBtn}
                            onClick={() => {
                                window.open(`/f/${form.share_url}`, '_blank');
                            }}
                        >
                            Preview
                        </button>

                        <button
                            className={styles.saveBtn}
                            onClick={saveForm}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>

                        <button
                            className={`${styles.publishBtn} ${published ? styles.unpublishBtn : ''}`}
                            onClick={togglePublish}
                        >
                            {published ? 'Unpublish' : 'Publish'}
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden', width: '100%', height: '100%' }}>
                    {activeTab === 'builder' ? (
                        <Designer />
                    ) : (
                        <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
                            <FormResponses formId={form.id} formContent={form.content} />
                        </div>
                    )}
                </div>
            </div>
        </DndContext>
    );
}
