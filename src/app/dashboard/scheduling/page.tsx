
"use client";

import { useAuth } from '@/app/context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface EventType {
    id: string;
    title: string;
    duration: number; // minutes
    slug: string;
    description?: string;
    header_text?: string;
}

export default function SchedulingPage() {
    const { user } = useAuth();
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Tabs & Bookings State
    const [activeTab, setActiveTab] = useState<'types' | 'bookings'>('types');
    const [bookings, setBookings] = useState<any[]>([]);

    // New Event Form State
    const [newEvent, setNewEvent] = useState({
        title: '',
        duration: 30, // default 30 mins
        description: '',
        header_text: 'CONSOLEGAL CONSULTATION'
    });

    // Edit Booking State
    const [editingBooking, setEditingBooking] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        attendee_name: '',
        attendee_email: '',
        start_time: '',
        end_time: '',
        status: 'confirmed',
        notes: '' // UI Only
    });

    // Formatting Filter
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (user) {
            if (activeTab === 'types') {
                fetchEventTypes();
            } else {
                fetchBookings();
            }
        }
    }, [user, activeTab]);

    const fetchEventTypes = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/scheduling/event-types');
            if (res.ok) {
                const data = await res.json();
                setEventTypes(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/scheduling/bookings');
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEvent.title) return toast.error("Title is required");

        try {
            const res = await fetch('/api/scheduling/event-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });

            if (res.ok) {
                toast.success("Event type created!");
                setShowCreateModal(false);
                fetchEventTypes();
                setNewEvent({ title: '', duration: 30, description: '', header_text: 'CONSOLEGAL CONSULTATION' });
            } else {
                toast.error("Failed to create event type");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error creating event");
        }
    };

    const copyLink = (slug: string) => {
        // Construct the public URL using ID to ensure unique lookup
        const id = user?.id || '';
        const url = `${window.location.origin}/s/${id}/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("Booking link copied!");
    };

    const handleEditBooking = (booking: any) => {
        setEditingBooking(booking);

        // Convert UTC time to local time for datetime-local input
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);

        // Format as YYYY-MM-DDTHH:mm for datetime-local input (in local timezone)
        const formatLocalDateTime = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setEditForm({
            attendee_name: booking.client_name || '',
            attendee_email: booking.client_email || '',
            start_time: formatLocalDateTime(startDate),
            end_time: formatLocalDateTime(endDate),
            status: booking.status || 'confirmed',
            notes: booking.notes || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateBooking = async () => {
        if (!editingBooking) return;

        try {
            // Convert datetime-local format to ISO string
            // datetime-local gives us "YYYY-MM-DDTHH:mm" in local time
            const startDateTime = new Date(editForm.start_time);
            const endDateTime = new Date(editForm.end_time);

            const updateData = {
                attendee_name: editForm.attendee_name,
                attendee_email: editForm.attendee_email,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                status: editForm.status,
                // notes: editForm.notes // Not sent to API
            };

            const res = await fetch(`/api/scheduling/bookings/${editingBooking.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (res.ok) {
                toast.success('Booking updated successfully!');
                setShowEditModal(false);
                setEditingBooking(null);
                fetchBookings();
            } else {
                toast.error('Failed to update booking');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error updating booking');
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        if (!confirm('Are you sure you want to delete this booking?')) return;

        try {
            const res = await fetch(`/api/scheduling/bookings/${bookingId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Booking deleted successfully!');
                fetchBookings();
            } else {
                toast.error('Failed to delete booking');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error deleting booking');
        }
    };

    // Event Type Edit/Delete
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event type?')) return;

        try {
            const res = await fetch(`/api/scheduling/event-types/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Event type deleted');
                fetchEventTypes();
            } else {
                toast.error('Failed to delete event type');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error deleting event type');
        }
    };

    const handleUpdateEvent = async () => {
        if (!editingEvent || !editingEvent.title) return toast.error("Title is required");

        try {
            const res = await fetch(`/api/scheduling/event-types/${editingEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingEvent)
            });

            if (res.ok) {
                toast.success("Event type updated!");
                setEditingEvent(null);
                fetchEventTypes();
            } else {
                toast.error("Failed to update event type");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating event");
        }
    };

    const exportBookingsToExcel = () => {
        const headers = ['Title', 'Start Time', 'End Time', 'Client Name', 'Client Email', 'Client Mobile', 'Company Name', 'Status', 'Notes'];
        const rows = bookings.map(b => [
            b.title,
            new Date(b.start_time).toLocaleString(),
            new Date(b.end_time).toLocaleString(),
            b.client_name || '',
            b.client_email || b.attendee_email || '', // Fallback to attendee_email
            b.attendee_mobile || '',
            b.company_name || '',
            b.status || 'confirmed',
            b.notes || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className={styles.loading}>
            <div className={styles.spinner}></div>
        </div>
    );

    return (
        <div className={styles.container}>
            {/* Top Navigation Bar */}
            <div className={styles.topNav}>
                <div className={styles.navTabsContainer}>
                    <button
                        onClick={() => setActiveTab('types')}
                        className={`${styles.navTab} ${activeTab === 'types' ? styles.navTabActive : ''}`}
                    >
                        Event Types
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`${styles.navTab} ${activeTab === 'bookings' ? styles.navTabActive : ''}`}
                    >
                        Booked Appointments
                    </button>
                </div>

                <div className={styles.topActions}>
                    {activeTab === 'bookings' && (
                        <button onClick={exportBookingsToExcel} className={styles.topActionButton} title="Export to CSV">
                            <i className="fa-sharp fa-thin fa-file-excel" style={{ fontSize: '18px' }}></i>
                            <span>Export</span>
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.contentArea}>
                {activeTab === 'types' ? (
                    <div className={styles.grid}>
                        {eventTypes.map(evt => (
                            <div key={evt.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3>{evt.title}</h3>
                                    <span className={styles.duration}>{evt.duration} min</span>
                                </div>
                                <p className={styles.description}>{evt.description || 'No description'}</p>
                                <div className={styles.cardActions}>
                                    <a href={`/s/${user?.id}/${evt.slug}`} target="_blank" className={styles.previewLink}>
                                        <i className="fa-light fa-arrow-up-right-from-square"></i> Preview
                                    </a>
                                    <div className={styles.actionButtonsRight}>
                                        <button
                                            onClick={() => copyLink(evt.slug)}
                                            className={styles.editButton}
                                            style={{ backgroundColor: 'rgba(2, 136, 209, 0.1)', color: '#0288d1' }}
                                            title="Copy Link"
                                        >
                                            <i className="fa-light fa-link"></i>
                                        </button>
                                        <button onClick={() => setEditingEvent(evt)} className={styles.editButton} title="Edit Service">
                                            <span>Edit</span>
                                        </button>
                                        <button onClick={() => handleDeleteEvent(evt.id)} className={styles.deleteButton} title="Delete Service">
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {eventTypes.length === 0 && (
                            <div className={styles.emptyState}>
                                <p>No event types created yet. Create one to start accepting bookings.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        {/* Status Filters */}
                        {/* Status Filters */}
                        <div className={styles.filtersContainer}>
                            {['all', 'confirmed', 'cancelled', 'completed'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`${styles.filterButton} ${statusFilter === status ? styles.filterButtonActive : ''}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {bookings.filter(b => statusFilter === 'all' || (b.status || 'confirmed') === statusFilter).length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>No bookings found for filter: {statusFilter}.</p>
                            </div>
                        ) : (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Date & Time</th>
                                        <th>Client</th>
                                        <th>Participant Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings
                                        .filter(b => statusFilter === 'all' || (b.status || 'confirmed') === statusFilter)
                                        .map((booking) => (
                                            <tr key={booking.id}>
                                                <td data-label="Title">{booking.title}</td>
                                                <td data-label="Date & Time">
                                                    {new Date(booking.start_time).toLocaleDateString('en-IN', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        timeZone: 'Asia/Kolkata'
                                                    })} at {new Date(booking.start_time).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'Asia/Kolkata'
                                                    })}
                                                </td>
                                                <td data-label="Client">
                                                    <div style={{ fontWeight: 500 }}>{booking.client_name}</div>
                                                    {booking.company_name && <div style={{ fontSize: '12px', color: '#666' }}>{booking.company_name}</div>}
                                                </td>
                                                <td data-label="Participant Type">
                                                    <span className={`${styles.statusBadge} ${styles[booking.participant_type] || ''}`} style={{ background: '#e0e7ff', color: '#0369a1' }}>
                                                        {booking.participant_type || booking.type || '-'}
                                                    </span>
                                                </td>
                                                <td data-label="Status">
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '50px',
                                                        backgroundColor: booking.status === 'confirmed' ? '#dcfce7' :
                                                            booking.status === 'cancelled' ? '#fee2e2' :
                                                                booking.status === 'completed' ? '#f1f5f9' : '#e0f2fe',
                                                        color: booking.status === 'confirmed' ? '#15803d' :
                                                            booking.status === 'cancelled' ? '#b91c1c' :
                                                                booking.status === 'completed' ? '#475569' : '#0369a1',
                                                        fontSize: '12px',
                                                        textTransform: 'capitalize',
                                                        display: 'inline-block',
                                                        fontWeight: 300
                                                    }}>
                                                        {booking.status || 'Confirmed'}
                                                    </span>
                                                </td>
                                                <td data-label="Actions">
                                                    <div className={styles.actionButtonsRight}>
                                                        <button
                                                            onClick={() => handleEditBooking(booking)}
                                                            className={styles.editButton}
                                                            title="Edit Booking"
                                                        >
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBooking(booking.id)}
                                                            className={styles.deleteButton}
                                                            title="Delete Booking"
                                                        >
                                                            <span>Delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* FAB for Create Event Type */}
            {activeTab === 'types' && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className={styles.fab}
                    title="Create New Event Type"
                >
                    <i className="fa-light fa-plus"></i>
                </button>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Create New Event Type</h2>
                            <button onClick={() => setShowCreateModal(false)} className={styles.closeButton}>
                                <i className="fa-light fa-xmark"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Event Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 15 Minute Discussion"
                                        value={newEvent.title}
                                        onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Public Header Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CONSOLEGAL CONSULTATION"
                                        value={newEvent.header_text}
                                        onChange={e => setNewEvent({ ...newEvent, header_text: e.target.value })}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Duration (minutes)</label>
                                    <select
                                        value={newEvent.duration}
                                        onChange={e => setNewEvent({ ...newEvent, duration: Number(e.target.value) })}
                                    >
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                    </select>
                                </div>

                                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                    <label>Description</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Brief description for the invitee"
                                        value={newEvent.description}
                                        onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button onClick={() => setShowCreateModal(false)} className={styles.cancelBtn}>Cancel</button>
                                <button onClick={handleCreateEvent} className={styles.saveBtn}>Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Event Type Modal */}
            {editingEvent && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Edit Event Type</h2>
                            <button onClick={() => setEditingEvent(null)} className={styles.closeButton}>
                                <i className="fa-light fa-xmark"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Event Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 15 Minute Discussion"
                                        value={editingEvent.title}
                                        onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Public Header Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CONSOLEGAL CONSULTATION"
                                        value={editingEvent.header_text || ''}
                                        onChange={e => setEditingEvent({ ...editingEvent, header_text: e.target.value })}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Duration (minutes)</label>
                                    <select
                                        value={editingEvent.duration}
                                        onChange={e => setEditingEvent({ ...editingEvent, duration: Number(e.target.value) })}
                                    >
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                    </select>
                                </div>

                                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                    <label>Description</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Brief description for the invitee"
                                        value={editingEvent.description || ''}
                                        onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button onClick={() => setEditingEvent(null)} className={styles.cancelBtn}>Cancel</button>
                                <button onClick={handleUpdateEvent} className={styles.saveBtn}>Update</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Booking Modal */}
            {showEditModal && editingBooking && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Edit Booking</h2>
                            <button onClick={() => setShowEditModal(false)} className={styles.closeButton}>
                                <i className="fa-light fa-xmark"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                                Event: <strong>{editingBooking.title}</strong>
                            </p>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Attendee Name</label>
                                    <input
                                        type="text"
                                        value={editForm.attendee_name}
                                        onChange={e => setEditForm({ ...editForm, attendee_name: e.target.value })}
                                        placeholder="Client name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Attendee Email</label>
                                    <input
                                        type="email"
                                        value={editForm.attendee_email}
                                        onChange={e => setEditForm({ ...editForm, attendee_email: e.target.value })}
                                        placeholder="client@example.com"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.start_time}
                                        onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.end_time}
                                        onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="confirmed">Confirmed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                    <label>Notes (View Only)</label>
                                    <textarea
                                        rows={3}
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                        placeholder="Additional notes..."
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button onClick={() => setShowEditModal(false)} className={styles.cancelBtn}>Cancel</button>
                                <button onClick={handleUpdateBooking} className={styles.saveBtn}>Update Booking</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
