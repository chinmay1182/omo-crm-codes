
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';
import toast from 'react-hot-toast';

interface TicketDetail {
    id: string;
    ticket_number: string;
    subject: string;
    category: string;
    source: string;
    status: string;
    priority: string;
    sla_policy: string;
    sla_deadline: string;
    description: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    created_at: string;
    updated_at?: string;
    comments: Comment[];
    is_red_flag?: boolean; // Added
    assigned_to_user?: {
        email: string;
        id: string;
    };
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    created_by: string;
    is_internal: boolean;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [ticket, setTicket] = useState<TicketDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [ticketId, setTicketId] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        params.then(p => {
            setTicketId(p.id);
        });
    }, [params]);

    useEffect(() => {
        if (ticketId) {
            fetchTicket();
        }
    }, [ticketId]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`);
            if (res.ok) {
                const data = await res.json();
                setTicket(data);
            } else {
                toast.error('Failed to load ticket');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [currentUser, setCurrentUser] = useState<string>('Support Agent');

    useEffect(() => {
        // Try to identify user (simple version)
        const checkUser = async () => {
            try {
                const res = await fetch('/api/auth/session');
                const data = await res.json();
                if (data?.user?.email) setCurrentUser(data.user.email);
            } catch (e) {
                console.error("Auth check failed", e);
            }
        };
        checkUser();
    }, []);

    const handleStatusChange = async (newStatus: string) => {
        if (!ticket) return;
        try {
            const res = await fetch(`/api/tickets/${ticket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success(`Status updated to ${newStatus}`);
                setTicket({ ...ticket, status: newStatus });
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error updating status');
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticket || !comment.trim()) return;

        setSendingComment(true);
        try {
            const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: comment,
                    created_by: currentUser,
                    is_internal: true // Explicitly internal as this is dashboard
                })
            });

            if (res.ok) {
                toast.success('Comment added');
                setComment('');
                fetchTicket(); // Refresh to see new comment
            } else {
                const errData = await res.json();
                toast.error(errData.error || 'Failed to add comment');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error adding comment');
        } finally {
            setSendingComment(false);
        }
    };

    const handlePrint = () => {
        if (!ticket) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
            <html>
            <head>
                <title>Ticket Details - #${ticket.ticket_number}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    h1 { color: #15426d; border-bottom: 2px solid #15426d; padding-bottom: 10px; margin-bottom: 20px; }
                    .header-meta { display: flex; justify-content: space-between; margin-bottom: 20px; color: #666; font-size: 14px; }
                    .detail-row { display: flex; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                    .label { font-weight: bold; width: 180px; color: #555; }
                    .value { flex: 1; }
                    .section { margin-top: 30px; }
                    .section-title { font-size: 18px; color: #15426d; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    .description { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #eee; margin-bottom: 20px; }
                    .comment-box { background: #f5f5f5; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0; margin-bottom: 10px; }
                    .comment-meta { font-size: 11px; color: #888; margin-bottom: 4px; display: flex; justify-content: space-between; }
                    .comment-content { font-size: 13px; color: #333; }
                </style>
            </head>
            <body>
                <h1>Ticket #${ticket.ticket_number || ticket.id.substring(0, 8)}</h1>
                
                <div class="header-meta">
                    <span><strong>Status:</strong> ${ticket.status}</span>
                    <span><strong>Priority:</strong> ${ticket.priority}</span>
                    <span><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</span>
                </div>

                <div class="section">
                    <div class="section-title">Ticket Information</div>
                    <div class="detail-row"><span class="label">Subject:</span><span class="value">${ticket.subject}</span></div>
                    <div class="detail-row"><span class="label">Category:</span><span class="value">${ticket.category}</span></div>
                    <div class="detail-row"><span class="label">Source:</span><span class="value">${ticket.source}</span></div>
                    <div class="detail-row"><span class="label">SLA Deadline:</span><span class="value">${ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : 'N/A'}</span></div>
                </div>

                <div class="section">
                    <div class="section-title">Contact Details</div>
                    <div class="detail-row"><span class="label">Name:</span><span class="value">${ticket.contact_name}</span></div>
                    <div class="detail-row"><span class="label">Email:</span><span class="value">${ticket.contact_email}</span></div>
                    <div class="detail-row"><span class="label">Phone:</span><span class="value">${ticket.contact_phone || 'N/A'}</span></div>
                </div>

                <div class="section">
                    <div class="section-title">Description</div>
                    <div class="description">${ticket.description}</div>
                </div>

                ${ticket.comments && ticket.comments.length > 0 ? `
                    <div class="section">
                        <div class="section-title">Conversation History</div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${ticket.comments.map((c) => `
                                <div class="comment-box">
                                    <div class="comment-meta">
                                        <span>${c.is_internal ? 'Staff' : 'User/System'}</span>
                                        <span>${new Date(c.created_at).toLocaleString()}</span>
                                    </div>
                                    <div class="comment-content">${c.content}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
                    Generated from ConsoLegal CRM on ${new Date().toLocaleString()}
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
            `);
            printWindow.document.close();
        }
    };

    if (loading) return <div className={styles.container}>Loading...</div>;
    if (!ticket) return <div className={styles.container}>Ticket not found</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <div className={styles.ticketMeta}>
                        <span className={styles.ticketTitle}>
                            #{ticket.ticket_number || ticket.id.substring(0, 8)} - {ticket.subject}
                        </span>
                        <span className={`${styles.statusBadge} ${styles[`status${ticket.status}`]}`}>
                            {ticket.status}
                        </span>
                    </div>
                    <p style={{ marginTop: '8px', color: '#64748b' }}>
                        Created on {new Date(ticket.created_at).toLocaleString()} via {ticket.source}
                        {ticket.updated_at && (
                            <span style={{ marginLeft: '16px' }}>
                                • Last Updated: {new Date(ticket.updated_at).toLocaleString()}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className={styles.submitButton}
                        onClick={handlePrint}
                        style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ccc' }}
                        title="Print Ticket Details"
                    >
                        <i className="fa-regular fa-print" style={{ marginRight: '8px' }}></i> Print
                    </button>
                    <button
                        className={styles.submitButton}
                        onClick={() => router.push('/dashboard/tickets')}
                        style={{ background: 'white', color: '#333', border: '1px solid #ccc' }}
                    >
                        Back to List
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Main Content */}
                <div className={styles.mainColumn}>
                    <div className={styles.card}>
                        <div className={styles.infoGrid}>
                            <div>
                                <p className={styles.infoLabel}>Contact Name</p>
                                <p className={styles.infoValue}>
                                    {ticket.contact_name || 'N/A'}
                                    {/* Auto Flag Indicator */}
                                    {ticket.is_red_flag ? (
                                        <i
                                            className="fa-solid fa-flag"
                                            style={{ color: '#dc2626', marginLeft: '8px', fontSize: '16px' }}
                                            title="🔴 Repeat Customer - This contact has raised tickets before"
                                        ></i>
                                    ) : (
                                        <i
                                            className="fa-solid fa-flag"
                                            style={{ color: '#16a34a', marginLeft: '8px', fontSize: '16px' }}
                                            title="🟢 New Customer - This is their first ticket"
                                        ></i>
                                    )}</p>
                            </div>
                            <div>
                                <p className={styles.infoLabel}>Email</p>
                                <p className={styles.infoValue}>{ticket.contact_email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className={styles.infoLabel}>Phone</p>
                                <p className={styles.infoValue}>{ticket.contact_phone || 'N/A'}</p>
                            </div>
                            <div style={{ gridColumn: '1/-1', marginTop: '1rem' }}>
                                <p className={styles.infoLabel}>Description</p>
                                <p className={styles.commentBody}>{ticket.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.commentsSection}>
                        <h3 className={styles.sidebarTitle}>Conversation</h3>
                        {ticket.comments && ticket.comments.length > 0 ? (
                            ticket.comments.map((c) => (
                                <div key={c.id} className={styles.comment}>
                                    <div className={styles.commentHeader}>
                                        <span style={{ fontWeight: 600 }}>{c.is_internal ? 'Staff' : 'User/System'}</span>
                                        <span>{new Date(c.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.commentBody}>{c.content}</div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No comments yet.</p>
                        )}

                        <div className={styles.commentInputArea}>
                            <form onSubmit={handleCommentSubmit}>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Type your reply here..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="submit" className={styles.submitButton} disabled={sendingComment}>
                                        {sendingComment ? 'Sending...' : 'Post Reply'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.card}>
                        <div className={styles.sidebarSection}>
                            <p className={styles.sidebarTitle}>Status</p>
                            <select
                                className={styles.select}
                                value={ticket.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                            >
                                <option value="Open">Open</option>
                                <option value="Pending">Pending</option>
                                <option value="Closed">Closed</option>
                                <option value="Escalated">Escalated</option>
                                <option value="Deferred">Deferred</option>
                            </select>
                        </div>

                        <div className={styles.sidebarSection}>
                            <p className={styles.sidebarTitle}>Priority</p>
                            <div className={styles.infoValue}>{ticket.priority}</div>
                        </div>

                        <div className={styles.sidebarSection}>
                            <p className={styles.sidebarTitle}>SLA Deadline</p>
                            <div className={styles.infoValue}>
                                {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : 'No SLA'}
                            </div>
                        </div>

                        <div className={styles.sidebarSection}>
                            <p className={styles.sidebarTitle}>Category</p>
                            <div className={styles.infoValue}>{ticket.category}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
