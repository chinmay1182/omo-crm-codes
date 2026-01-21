
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import toast from "react-hot-toast";

interface Contact {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    mobile?: string;
}

interface Submission {
    id: string;
    created_at: string;
    content: string;
    contact_id: string;
    forms: {
        name: string;
    };
}

interface Form {
    id: string;
    name: string;
    share_url: string;
    published: boolean;
}

export default function ContactFormSubmissions({
    contact,
    onScheduleMeeting
}: {
    contact: Contact;
    onScheduleMeeting?: (submission: Submission) => void;
}) {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFormId, setSelectedFormId] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Submissions
                const subRes = await fetch(`/api/contacts/${contact.id}/submissions`);
                if (subRes.ok) {
                    const data = await subRes.json();
                    setSubmissions(data);
                }

                // Fetch Forms (for sending)
                if (user?.id) {
                    const formRes = await fetch(`/api/forms?userId=${user.id}`);
                    if (formRes.ok) {
                        const formData = await formRes.json();
                        setForms(formData.filter((f: Form) => f.published));
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (contact?.id) {
            fetchData();
        }
    }, [contact?.id, user]);

    const getFormLink = () => {
        if (!selectedFormId) return "";
        const form = forms.find(f => f.id === selectedFormId);
        if (!form) return "";
        return `${window.location.origin}/f/${form.share_url}?contactId=${contact.id}`;
    };

    const handleCopyLink = () => {
        const link = getFormLink();
        if (!link) return;
        navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard!");
    };

    const handleSendEmail = () => {
        const link = getFormLink();
        if (!link) return;
        if (!contact.email) {
            toast.error("Contact has no email address");
            return;
        }
        const subject = encodeURIComponent("Please fill out this form");
        const body = encodeURIComponent(`Hello ${contact.first_name},\n\nPlease fill out the following form:\n${link}\n\nThank you.`);
        window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_blank');
    };

    const handleSendWhatsApp = () => {
        const link = getFormLink();
        if (!link) return;

        let phone = contact.mobile || contact.phone;
        if (!phone) {
            toast.error("Contact has no mobile number");
            return;
        }

        // Basic cleanup for whatsapp: remove non-numeric chars
        phone = phone.replace(/\D/g, '');

        const text = encodeURIComponent(`Hello ${contact.first_name}, please fill out this form: ${link}`);
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    if (loading) return <div style={{ padding: '20px', color: '#666' }}>Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Send Form Section */}
            <div style={{
                background: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#444' }}>
                            Select Form to Send
                        </label>
                        <select
                            value={selectedFormId}
                            onChange={(e) => setSelectedFormId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ced4da',
                                fontSize: '14px'
                            }}
                        >
                            <option value="">-- Choose a form --</option>
                            {forms.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleCopyLink}
                        disabled={!selectedFormId}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: selectedFormId ? '#15426d' : '#e9ecef',
                            color: selectedFormId ? 'white' : '#adb5bd',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedFormId ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <i className="fa-light fa-link"></i>
                        Copy Link
                    </button>

                    <button
                        onClick={handleSendEmail}
                        disabled={!selectedFormId || !contact.email}
                        title={!contact.email ? "No email address" : "Send via Email"}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: selectedFormId && contact.email ? '#0d6efd' : '#e9ecef',
                            color: selectedFormId && contact.email ? 'white' : '#adb5bd',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedFormId && contact.email ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <i className="fa-light fa-envelope"></i>
                        Email
                    </button>

                    <button
                        onClick={handleSendWhatsApp}
                        disabled={!selectedFormId || (!contact.mobile && !contact.phone)}
                        title={(!contact.mobile && !contact.phone) ? "No mobile number" : "Send via WhatsApp"}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: selectedFormId && (contact.mobile || contact.phone) ? '#25D366' : '#e9ecef',
                            color: selectedFormId && (contact.mobile || contact.phone) ? 'white' : '#adb5bd',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedFormId && (contact.mobile || contact.phone) ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <i className="fa-brands fa-whatsapp"></i>
                        WhatsApp
                    </button>
                </div>
            </div>

            {/* Submissions List */}
            {submissions.length === 0 ? (
                <div style={{
                    padding: '30px',
                    textAlign: 'center',
                    color: '#999',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #eee'
                }}>
                    No form submissions received from this contact yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ margin: 0, color: '#444' }}>Past Submissions</h4>
                    {submissions.map((sub) => {
                        const content = JSON.parse(sub.content);
                        return (
                            <div key={sub.id} style={{
                                background: 'white',
                                padding: '16px',
                                borderRadius: '8px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid #eee'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, color: '#15426d', fontWeight: 600 }}>{sub.forms?.name || 'Untitled Form'}</h4>
                                        <span style={{ fontSize: '12px', color: '#999' }}>{new Date(sub.created_at).toLocaleString()}</span>
                                    </div>
                                    {onScheduleMeeting && (
                                        <button
                                            onClick={() => onScheduleMeeting(sub)}
                                            style={{
                                                background: '#fff',
                                                border: '1px solid #15426d',
                                                color: '#15426d',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                            title="Schedule a meeting based on this submission"
                                        >
                                            <i className="fa-regular fa-calendar-plus"></i>
                                            Convert to Meeting
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {Object.entries(content).map(([key, value]) => {
                                        if (key === 'contact_id') return null;

                                        const valStr = String(value);
                                        const isRating = !isNaN(Number(valStr)) && Number(valStr) <= 5 && Number(valStr) >= 0 && valStr.length === 1;

                                        return (
                                            <div key={key} style={{ fontSize: '14px', color: '#444' }}>
                                                <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                                                    {isRating ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ color: '#666', fontSize: '12px', fontWeight: 500 }}>Rating:</span>
                                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                                {[...Array(5)].map((_, i) => (
                                                                    <i
                                                                        key={i}
                                                                        className={`fa-star ${i < Number(valStr) ? 'fa-solid' : 'fa-regular'}`}
                                                                        style={{ color: i < Number(valStr) ? '#FFD700' : '#ddd', fontSize: '14px' }}
                                                                    ></i>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{valStr}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
