
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Added Image import
import styles from './styles.module.css';
import { usePermission } from '@/app/hooks/usePermission';
import toast from 'react-hot-toast';
import AccessDeniedTemplate from '@/app/components/ui/AccessDeniedTemplate';

interface Ticket {
    id: string; // Restored ID
    ticket_number: string;
    subject: string;
    category: string;
    source: string;
    status: string;
    priority: string;
    sla_policy: string;
    sla_deadline: string;
    created_at: string;
    updated_at: string; // Last updated timestamp
    description: string; // Added for excel export
    assigned_to_user?: {
        email: string;
    };
    assigned_to?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    is_red_flag?: boolean;
    internal_notes?: string;
}

export default function TicketsPage() {
    const { hasPermission, isModuleEnabled, user } = usePermission();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [faqs, setFaqs] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]); // New state for categories
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        closed: 0,
        escalated: 0
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // State for live SLA updates
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/tickets/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error('Failed to fetch categories', error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Agents
    const [agents, setAgents] = useState<any[]>([]);
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const res = await fetch('/api/agents');
                if (res.ok) {
                    const data = await res.json();
                    setAgents(data.agents || []);
                }
            } catch (error) {
                console.error('Failed to fetch agents', error);
            }
        };
        fetchAgents();
    }, []);

    const handleAssignChange = async (ticketId: string, assignedTo: string) => {
        if (!hasPermission('tickets', 'transfer_ticket')) {
            toast.error('You do not have permission to transfer tickets');
            return;
        }
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: assignedTo || null })
            });

            if (res.ok) {
                const updater = (list: Ticket[]) => list.map(t => t.id === ticketId ? { ...t, assigned_to: assignedTo } : t);
                setTickets(updater);
                setFilteredTickets(updater);
            }
        } catch (error) {
            console.error('Failed to update assignment', error);
        }
    };

    const handleExportExcel = () => {
        if (!filteredTickets.length) return;

        const headers = ['Ticket ID', 'Ticket Number', 'Subject', 'Status', 'Priority', 'Category', 'Contact Name', 'Contact Email', 'Contact Phone', 'Created At', 'Last Updated', 'Description', 'Internal Notes'];
        const csvContent = [
            headers.join(','),
            ...filteredTickets.map(t => {
                const row = [
                    t.id,
                    t.ticket_number || '',
                    `"${(t.subject || '').replace(/"/g, '""')}"`,
                    t.status,
                    t.priority,
                    t.category,
                    `"${(t.contact_name || '').replace(/"/g, '""')}"`,
                    t.contact_email || '',
                    t.contact_phone || '',
                    new Date(t.created_at).toISOString(),
                    t.updated_at ? new Date(t.updated_at).toISOString() : '',
                    `"${(t.description || '').replace(/"/g, '""')}"`,
                    `"${(t.internal_notes || '').replace(/"/g, '""')}"`
                ];
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, statusFilter, categoryFilter, user]);

    // Derived state for View Permissions
    // We filter the tickets LOCALLY for now, though API filtering is better for security/performance long term.
    const accessibleTickets = filteredTickets.filter(ticket => {
        if (user?.type !== 'agent') return true;

        if (hasPermission('tickets', 'view_all')) return true;

        if (hasPermission('tickets', 'view_assigned')) {
            // Basic strict equality check. Adjust if types differ (string vs number)
            return String(ticket.assigned_to) === String(user.id);
        }

        return false;
    });


    const fetchTickets = async () => {
        if (!isModuleEnabled('tickets') && user?.type === 'agent') {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (categoryFilter) params.append('category', categoryFilter);
            if (debouncedSearch) params.append('search', debouncedSearch);

            // Fetch Tickets and FAQs in parallel
            const [ticketsRes, faqsRes] = await Promise.all([
                fetch(`/api/tickets?${params.toString()}`),
                debouncedSearch ? fetch(`/api/tickets/faqs?search=${encodeURIComponent(debouncedSearch)}`) : Promise.resolve(null)
            ]);

            if (ticketsRes.ok) {
                const data = await ticketsRes.json();
                setTickets(data);
                setFilteredTickets(data);
                calculateStats(data);
            }

            if (faqsRes && faqsRes.ok) {
                const faqData = await faqsRes.json();
                setFaqs(Array.isArray(faqData) ? faqData : []);
            } else if (!debouncedSearch) {
                setFaqs([]);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    // applyFilters removed as we do backend filtering now

    const calculateStats = (data: Ticket[]) => {
        setStats({
            total: data.length,
            open: data.filter(t => t.status === 'Open').length,
            closed: data.filter(t => t.status === 'Closed').length,
            escalated: data.filter(t => t.status === 'Escalated').length
        });
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        if (!hasPermission('tickets', 'edit')) {
            toast.error('You do not have permission to edit tickets');
            return;
        }
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const updater = (list: Ticket[]) => list.map(t => t.id === ticketId ? { ...t, status: newStatus } : t);
                setTickets(updater);
                setFilteredTickets(updater);
                // Re-calculate stats might be needed if looking at global stats, but sticking to local update for UI snapiness
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handlePriorityChange = async (ticketId: string, newPriority: string) => {
        if (!hasPermission('tickets', 'edit')) {
            toast.error('You do not have permission to edit tickets');
            return;
        }
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority })
            });

            if (res.ok) {
                const updater = (list: Ticket[]) => list.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t);
                setTickets(updater);
                setFilteredTickets(updater);
            }
        } catch (error) {
            console.error('Failed to update priority', error);
        }
    };

    const getRepeatCount = (ticket: Ticket) => {
        if (!ticket.contact_email && !ticket.contact_phone) return 0;
        // Count in the current filtered list. 
        // Note: For perfect accuracy this should be global, but current-list context is often useful too.
        // Or better, count in 'tickets' (if we fetch all). 
        // But since we moved to backend filtering, 'tickets' only has filtered results.
        // It's a trade-off. For now, counting in view is acceptable.
        return accessibleTickets.filter(t =>
            (t.contact_email && t.contact_email === ticket.contact_email) ||
            (t.contact_phone && t.contact_phone === ticket.contact_phone)
        ).length;
    };

    const calculateSLA = (ticket: Ticket) => {
        if (!ticket.created_at) return null;

        const created = new Date(ticket.created_at);

        // Stop SLA if Closed or Deferred using updated_at as the reference point
        let referenceTime = now;
        if ((ticket.status === 'Closed' || ticket.status === 'Deferred') && ticket.updated_at) {
            referenceTime = new Date(ticket.updated_at);
        }

        const elapsedMs = referenceTime.getTime() - created.getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        // SLA Thresholds in Hours
        const LIMIT_SLA1 = 4;
        const LIMIT_SLA2 = 24;
        const LIMIT_SLA3 = 72;

        let label = '';
        let targetMs = 0;
        let isOverdue = false;
        let color = '#16a34a'; // Green

        if (elapsedHours < LIMIT_SLA1) {
            label = 'SLA-1';
            targetMs = created.getTime() + LIMIT_SLA1 * 3600000;
        } else if (elapsedHours < LIMIT_SLA2) {
            label = 'SLA-2';
            targetMs = created.getTime() + LIMIT_SLA2 * 3600000;
            color = '#ca8a04'; // Yellow/Orange warning
        } else if (elapsedHours < LIMIT_SLA3) {
            label = 'SLA-3';
            targetMs = created.getTime() + LIMIT_SLA3 * 3600000;
            color = '#ea580c'; // Orange
        } else {
            label = 'Overdue';
            // Count how much time has passed SINCE the last deadline (SLA3)
            targetMs = created.getTime() + LIMIT_SLA3 * 3600000;
            isOverdue = true;
            color = '#dc2626'; // Red
        }

        const diffMs = targetMs - referenceTime.getTime();
        const absDiff = Math.abs(diffMs);
        const h = Math.floor(absDiff / (1000 * 60 * 60));
        const m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

        const timeText = `${h}h ${m}m`;

        return {
            text: isOverdue ? `${label} (${timeText})` : `${label}: ${timeText}`,
            isOverdue,
            color
        };
    };

    const handleDelete = async (ticketId: string) => {
        if (!hasPermission('tickets', 'delete')) {
            toast.error('You do not have permission to delete tickets');
            return;
        }
        if (!confirm('Are you sure you want to delete this ticket?')) return;

        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                const updatedTickets = tickets.filter(t => t.id !== ticketId);
                setTickets(updatedTickets);
                calculateStats(updatedTickets);
            }
        } catch (error) {
            console.error('Failed to delete ticket', error);
        }
    };

    const handleAddNote = async (ticketId: string, currentNote: string | undefined) => {
        if (!hasPermission('tickets', 'edit')) {
            toast.error('You do not have permission to edit tickets');
            return;
        }
        const note = window.prompt("Enter internal note:", currentNote || "");
        if (note === null) return; // Cancelled

        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ internal_notes: note })
            });

            if (res.ok) {
                // Update local state
                setTickets(tickets.map(t => t.id === ticketId ? { ...t, internal_notes: note } : t));
            } else {
                alert("Failed to save note");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving note");
        }
    };

    if (!loading && !isModuleEnabled('tickets')) {
        return <AccessDeniedTemplate moduleName="Tickets" />;
    }

    return (
        <div className={styles.container}>
            {/* Top Navigation Bar */}
            <div className={styles.topNav}>
                <div className={styles.navTabsContainer}>
                    <div className={`${styles.navTab} ${styles.active}`}>
                        All Tickets
                    </div>
                </div>

                <div className={styles.topActions}>
                    <button onClick={() => router.push('/dashboard/tickets/faqs')} className={styles.topActionButton}>
                        <i className="fa-sharp fa-thin fa-circle-question" style={{ fontSize: '18px', color: '#212121' }}></i>
                        <span>FAQs</span>
                    </button>
                    <button onClick={() => router.push('/dashboard/tickets/settings')} className={styles.topActionButton}>
                        <i className=" fa-sharp fa-thin fa-ellipsis" style={{ fontSize: '18px', color: '#212121' }}></i>
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            <div className={styles.contentArea}>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                            <div>
                                <p className={styles.statTitle}>Total Tickets</p>
                                <p className={styles.statValue} style={{ marginTop: '5px' }}>{stats.total}</p>
                            </div>
                            <Image src="/tickets/total.png" alt="Total Tickets" width={100} height={100} style={{ objectFit: 'contain' }} unoptimized />
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                            <div>
                                <p className={styles.statTitle}>Open Tickets</p>
                                <p className={styles.statValue} style={{ marginTop: '5px' }}>{stats.open}</p>
                            </div>
                            <Image src="/tickets/open-tickets.png" alt="Open Tickets" width={100} height={100} style={{ objectFit: 'contain' }} unoptimized />
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                            <div>
                                <p className={styles.statTitle}>Closed Tickets</p>
                                <p className={styles.statValue} style={{ marginTop: '5px' }}>{stats.closed}</p>
                            </div>
                            <Image src="/tickets/closed.png" alt="Closed Tickets" width={100} height={100} style={{ objectFit: 'contain' }} unoptimized />
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                            <div>
                                <p className={styles.statTitle}>Escalated</p>
                                <p className={styles.statValue} style={{ marginTop: '5px' }}>{stats.escalated}</p>
                            </div>
                            <Image src="/tickets/escalated.png" alt="Escalated" width={100} height={100} style={{ objectFit: 'contain' }} unoptimized />
                        </div>
                    </div>
                </div>

                {/* MCQ/FAQ Search Results */}
                {faqs.length > 0 && debouncedSearch && (
                    <div className={styles.tableContainer} style={{ marginBottom: '20px', padding: '20px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-regular fa-lightbulb" style={{ color: '#eab308' }}></i>
                            Found Matching FAQs
                        </h2>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {faqs.map((faq: any) => (
                                <div key={faq.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>{faq.question}</h3>
                                    <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{faq.answer}</p>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Category: {faq.category || 'General'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tickets Table */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <h2 className={styles.tableTitle}>Recent Tickets</h2>
                        <div className={styles.filters}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search tickets or FAQs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={styles.select}
                                    style={{ paddingRight: '30px', minWidth: '200px' }}
                                />
                                <i className="fa-light fa-search" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}></i>
                            </div>
                            <select
                                className={styles.select}
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <select
                                className={styles.select}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="Open">Open</option>
                                <option value="Pending">Pending</option>
                                <option value="Closed">Closed</option>
                                <option value="Escalated">Escalated</option>
                                <option value="Deferred">Deferred</option>
                            </select>
                            <button
                                onClick={handleExportExcel}
                                className={styles.actionButton}
                                title="Export to Excel (CSV)"
                            >
                                <i className="fa-light fa-file-export" style={{ marginRight: '6px' }}></i>
                                Export
                            </button>
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Tier ID</th>
                                    <th>Subject</th>
                                    <th>Contact</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>SLA</th>
                                    <th>Assigned To</th>
                                    <th>Created</th>
                                    <th>Last Updated</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={12} className={styles.loading}>Loading tickets...</td>
                                    </tr>
                                ) : accessibleTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className={styles.empty}>No tickets found.</td>
                                    </tr>
                                ) : (
                                    accessibleTickets.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td>
                                                <Link href={`/dashboard/tickets/${ticket.id}`} className={styles.link}>
                                                    {ticket.ticket_number || `#${ticket.id.substring(0, 6)}`}
                                                </Link>
                                            </td>
                                            <td>
                                                {ticket.subject}
                                                {/* Notes Indicator */}
                                                <i
                                                    className={`fa-solid fa-sticky-note`}
                                                    style={{
                                                        marginLeft: '8px',
                                                        color: ticket.internal_notes ? '#eab308' : '#cbd5e1', // Yellow if notes exist, gray if empty
                                                        cursor: hasPermission('tickets', 'edit') ? 'pointer' : 'default',
                                                        fontSize: '14px'
                                                    }}
                                                    title={ticket.internal_notes || "Add Note"}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (hasPermission('tickets', 'edit')) {
                                                            handleAddNote(ticket.id, ticket.internal_notes);
                                                        }
                                                    }}
                                                ></i>
                                            </td>
                                            <td>
                                                {ticket.contact_name || '-'}
                                                {/* Flag Indicator */}
                                                {ticket.is_red_flag ? (
                                                    <i
                                                        className="fa-solid fa-flag"
                                                        style={{ color: '#dc2626', marginLeft: '6px', fontSize: '14px' }}
                                                        title="🔴 Repeat Customer"
                                                    ></i>
                                                ) : (
                                                    <i
                                                        className="fa-solid fa-flag"
                                                        style={{ color: '#16a34a', marginLeft: '6px', fontSize: '14px' }}
                                                        title="🟢 New Customer"
                                                    ></i>
                                                )}
                                                {getRepeatCount(ticket) > 1 && (
                                                    <span
                                                        style={{ marginLeft: '4px', fontSize: '11px', color: '#64748b', fontWeight: '500' }}
                                                        title="Repeated tickets"
                                                    >
                                                        ({getRepeatCount(ticket)})
                                                    </span>
                                                )}
                                            </td>
                                            <td>{ticket.category}</td>
                                            <td>
                                                <select
                                                    className={styles.select}
                                                    value={ticket.priority}
                                                    onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                                                    style={{
                                                        fontSize: '14px',
                                                        padding: '6px 0',
                                                        cursor: hasPermission('tickets', 'edit') ? 'pointer' : 'not-allowed'
                                                    }}
                                                    disabled={!hasPermission('tickets', 'edit')}
                                                >
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                    <option value="Critical">Critical</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select
                                                    className={styles.select}
                                                    value={ticket.status}
                                                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                    style={{ fontSize: '14px', padding: '6px 0', cursor: hasPermission('tickets', 'edit') ? 'pointer' : 'not-allowed' }}
                                                    disabled={!hasPermission('tickets', 'edit')}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Closed">Closed</option>
                                                    <option value="Escalated">Escalated</option>
                                                    <option value="Deferred">Deferred</option>
                                                </select>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    {(() => {
                                                        const sla = calculateSLA(ticket);
                                                        if (!sla) return null;
                                                        return (
                                                            <span style={{
                                                                color: sla.color,
                                                                fontWeight: '400',
                                                                fontSize: '11px'
                                                            }}>
                                                                {sla.text}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    className={styles.select}
                                                    value={ticket.assigned_to || ''}
                                                    onChange={(e) => handleAssignChange(ticket.id, e.target.value)}
                                                    style={{ fontSize: '14px', padding: '6px 0', cursor: hasPermission('tickets', 'transfer_ticket') ? 'pointer' : 'not-allowed' }}
                                                    disabled={!hasPermission('tickets', 'transfer_ticket')}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {agents.map((agent: any) => (
                                                        <option key={agent.id} value={agent.id}>
                                                            {agent.full_name || agent.username || agent.email}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                                            <td>
                                                {ticket.updated_at ? (
                                                    <div style={{ fontSize: '11px' }}>
                                                        <div>{new Date(ticket.updated_at).toLocaleDateString()}</div>
                                                        <div style={{ color: '#64748b' }}>{new Date(ticket.updated_at).toLocaleTimeString()}</div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button
                                                        className={styles.actionButton}
                                                        onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                                                    >
                                                        View
                                                    </button>
                                                    {hasPermission('tickets', 'delete') && (
                                                        <button
                                                            className={styles.deleteButton}
                                                            onClick={() => handleDelete(ticket.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* FAB for Create Ticket */}
            {hasPermission('tickets', 'create') && (
                <button
                    onClick={() => router.push('/dashboard/tickets/create')}
                    className={styles.fab}
                    title="Create Ticket"
                >
                    <i className="fa-light fa-plus"></i>
                </button>
            )}
        </div >
    );
}
