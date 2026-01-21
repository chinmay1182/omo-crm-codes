
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FormElements, FormElementInstance } from '@/app/dashboard/form-builder/_components/FormElements';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function PublicFormPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const contactId = searchParams.get('contactId');

    const id = params?.id as string;
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (id) {
            fetchForm();
        }
    }, [id]);

    const fetchForm = async () => {
        try {
            const res = await fetch(`/api/forms/public/${id}`);
            const data = await res.json();

            if (res.ok) {
                setForm(data);
            } else {
                setForm(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const submitValue = (key: string, value: string) => {
        setFormValues(prev => ({ ...prev, [key]: value }));
    };

    const validateForm = () => {
        const errors: Record<string, boolean> = {};
        const elements = JSON.parse(form.content) as FormElementInstance[];

        let isValid = true;

        elements.forEach(element => {
            const actualValue = formValues[element.id];
            const isRequired = element.extraAttributes?.required;

            if (isRequired && !actualValue) {
                errors[element.id] = true;
                isValid = false;
            }
        });

        setFormErrors(errors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const res = await fetch(`/api/forms/${form.id}/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formValues,
                    contact_id: contactId
                }),
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success('Submitted successfully');
            } else {
                toast.error('Submission failed');
            }
        } catch (e) {
            toast.error('Error submitting form');
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#f8f9fa',
                gap: '16px'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #11a454',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 300, fontFamily: 'Open Sauce One, sans-serif' }}>
                    Loading form...
                </p>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!form) return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            gap: '16px',
            background: '#f8f9fa',
            fontFamily: 'Open Sauce One, sans-serif'
        }}>
            <i className="fa-light fa-file-slash" style={{ fontSize: '64px', color: '#cbd5e1' }}></i>
            <h1 style={{ fontSize: '24px', fontWeight: 300, color: '#1e293b' }}>Form Not Found</h1>
            <p style={{ color: '#64748b', fontWeight: 300 }}>This form does not exist or has been removed.</p>
        </div>
    );

    if (!form.published) return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            gap: '16px',
            background: '#f8f9fa',
            fontFamily: 'Open Sauce One, sans-serif'
        }}>
            <i className="fa-light fa-lock" style={{ fontSize: '64px', color: '#cbd5e1' }}></i>
            <h1 style={{ fontSize: '24px', fontWeight: 300, color: '#1e293b' }}>Form Not Accessible</h1>
            <p style={{ color: '#64748b', fontWeight: 300 }}>This form is not currently accepting submissions.</p>
        </div>
    );

    if (submitted) return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#f8f9fa',
            fontFamily: 'Open Sauce One, sans-serif'
        }}>
            <div style={{
                background: 'white',
                padding: '48px',
                borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '64px', color: '#11a454', marginBottom: '24px' }}>
                    <i className="fa-light fa-check-circle"></i>
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 300, marginBottom: '12px', color: '#1e293b' }}>Thank You!</h1>
                <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 300 }}>Your submission has been received.</p>
            </div>
        </div>
    );

    const elements = JSON.parse(form.content) as FormElementInstance[];

    return (
        <div style={{
            background: '#f8f9fa',
            backgroundImage: `url(/Capa%201.svg), url(/Topographic%204.svg)`,
            backgroundRepeat: 'no-repeat, no-repeat',
            backgroundSize: '400px 400px, 400px 400px',
            backgroundPosition: 'left center, right center',
            minHeight: '100vh',
            padding: '40px 16px',
            fontFamily: 'Open Sauce One, sans-serif'
        }}>
            <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }}>
                {/* Logo Area */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px 0' }}>
                    <Image
                        src="/consolegal.jpeg"
                        alt="Consolegal Logo"
                        width={150}
                        height={100}
                        style={{ objectFit: 'contain', maxHeight: '80px' }}
                        priority
                    />
                </div>

                {/* Header */}
                <div style={{
                    padding: '0 40px',
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <h1 style={{
                        fontSize: '20px',
                        fontWeight: 300,
                        color: '#1e293b',
                        margin: 0
                    }}>
                        {form.name}
                    </h1>
                    {form.description && (
                        <p style={{
                            marginTop: '10px',
                            color: '#64748b',
                            fontSize: '16px',
                            fontWeight: 300,
                            lineHeight: '1.6'
                        }}>
                            {form.description}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div style={{ padding: '40px' }}>
                    {elements.map(element => {
                        const FormComponent = FormElements[element.type].formComponent;
                        return (
                            <FormComponent
                                key={element.id}
                                elementInstance={element}
                                submitValue={submitValue}
                                isInvalid={formErrors[element.id]}
                                defaultValue={formValues[element.id]}
                            />
                        );
                    })}
                </div>

                {/* Footer / Submit */}
                <div style={{
                    padding: '12px 40px',
                    background: 'none',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={handleSubmit}
                        style={{
                            background: '#11a454',
                            color: 'white',
                            padding: '0.6rem',
                            borderRadius: '50px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 300,
                            cursor: 'pointer',
                            fontFamily: 'Open Sauce One, sans-serif',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(17, 164, 84, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#10964d';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(17, 164, 84, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#11a454';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(17, 164, 84, 0.2)';
                        }}
                    >
                        Submit Form
                    </button>
                </div>
            </div>
        </div>
    );
}
