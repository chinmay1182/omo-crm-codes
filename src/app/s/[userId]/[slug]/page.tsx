
"use client";

import { useState, useEffect } from 'react';
import { format, addDays, startOfToday, isSameDay, addMinutes, parseISO } from 'date-fns';
import { useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import styles from './page.module.css';

// Simple types
interface EventType {
    id: string;
    title: string;
    duration: number;
    description: string;
    user_id: string;
    header_text?: string;
}

export default function BookingPage() {
    const params = useParams();
    // params.userId and params.slug come from the URL folder structure [userId]/[slug]

    const [eventType, setEventType] = useState<EventType | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [bookingForm, setBookingForm] = useState({
        name: '',
        email: '',
        mobile: '',
        company_name: '',
        participant_type: '',
        notes: ''
    });
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/scheduling/public-event?userId=${params.userId}&slug=${params.slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setEventType(data);
                } else {
                    toast.error("Event type not found");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (params.userId && params.slug) {
            fetchDetails();
        }
    }, [params]);

    // Generate next 30 days
    const days = [...Array(30)].map((_, i) => addDays(startOfToday(), i));

    // Generate timeslots based on event duration
    const generateSlots = () => {
        if (!eventType) return [];

        const slots = [];
        let start = new Date(selectedDate);
        start.setHours(10, 30, 0, 0); // 10:30 AM

        const end = new Date(selectedDate);
        end.setHours(18, 30, 0, 0); // 6:30 PM

        const now = new Date();

        while (start < end) {
            const timeString = format(start, 'HH:mm');

            // Check if this slot is in the past
            let isPast = false;
            if (isSameDay(selectedDate, now)) {
                isPast = start <= now;
            }

            // Include all slots, but mark past ones as disabled
            slots.push({
                time: timeString,
                isPast: isPast
            });

            // Increment by event duration (15/30/45/60 mins)
            start = addMinutes(start, eventType.duration);
        }
        return slots;
    };

    const handleBook = async () => {
        if (!selectedTime || !bookingForm.name || !bookingForm.email || !bookingForm.mobile) return toast.error("Please fill all required fields");
        if (!eventType) return;

        setBookingStatus('submitting');

        const [hours, minutes] = selectedTime.split(':').map(Number);

        // Create a new date object with the selected date and time
        // Use the selected date directly to preserve the correct day
        const startTime = new Date(selectedDate);
        startTime.setHours(hours, minutes, 0, 0);

        const endTime = addMinutes(startTime, eventType.duration);

        try {
            const res = await fetch('/api/scheduling/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type_id: eventType.id,
                    host_user_id: eventType.user_id,
                    attendee_name: bookingForm.name,
                    attendee_email: bookingForm.email,
                    attendee_mobile: bookingForm.mobile,
                    company_name: bookingForm.company_name,
                    // Send as ISO string - the server will handle it correctly
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    notes: bookingForm.notes
                })
            });

            if (res.ok) {
                setBookingStatus('success');
            } else {
                throw new Error("Booking failed");
            }
        } catch (error) {
            toast.error("Failed to book meeting");
            setBookingStatus('idle');
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!eventType) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Event not found</div>;

    if (bookingStatus === 'success') {
        return (
            <div className={styles.bookingContainer}>
                <div className={styles.successContainer}>
                    <img src="/consolegal.jpeg" alt="Logo" className={styles.successLogo} />

                    <div className={styles.successIcon}>
                        ✓
                    </div>

                    <h2>Booking Scheduled</h2>
                    <p>You are scheduled with <strong>{eventType.title}</strong></p>

                    <div className={styles.successDetails}>
                        <div className={styles.successDetailsRow}>
                            <span>📅</span>
                            <div>
                                <div>{format(selectedDate, 'EEEE, MMMM do, yyyy')}</div>
                                <div>{selectedTime} ({eventType.duration} mins)</div>
                            </div>
                        </div>
                        <p className={styles.successNote}>A calendar intimation has been sent to your email address.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.bookingContainer}>
            <div className={styles.bookingCard}>
                {/* Left Panel: Details */}
                <div className={styles.leftPanel}>
                    <div>
                        <img src="/consolegal.jpeg" alt="Consolegal Logo" className={styles.logo} />
                    </div>

                    <p className={styles.headerText}>
                        {eventType.header_text}
                    </p>

                    <h1 className={styles.eventTitle}>{eventType.title}</h1>

                    <div className={styles.durationInfo}>
                        Meeting Duration:
                        <span>{eventType.duration} min</span>
                    </div>

                    {eventType.description && (
                        <div className={styles.description}>
                            <p>{eventType.description}</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Picker */}
                <div className={styles.rightPanel}>
                    <h3>Select a Date & Time</h3>

                    {!selectedTime ? (
                        <div className={styles.pickerContainer}>
                            {/* Date List */}
                            <div className={styles.dateList}>
                                <div>
                                    {days.map(day => (
                                        <button
                                            key={day.toISOString()}
                                            onClick={() => setSelectedDate(day)}
                                            className={`${styles.dateButton} ${isSameDay(day, selectedDate) ? styles.selected : ''}`}
                                        >
                                            {format(day, 'EEE, d MMM yyyy')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time List */}
                            <div className={styles.timeList}>
                                <div>
                                    {generateSlots().map(slot => (
                                        <button
                                            key={slot.time}
                                            onClick={() => !slot.isPast && setSelectedTime(slot.time)}
                                            disabled={slot.isPast}
                                            className={styles.timeButton}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.formContainer}>
                            <button
                                onClick={() => setSelectedTime(null)}
                                className={styles.backButton}
                            >
                                <i className="fa-thin fa-sharp fa-arrow-left" style={{ marginRight: '10px', fontSize: '20px' }}></i> Back to times
                            </button>

                            <h4>Enter Details</h4>
                            <div className={styles.formFields}>
                                <div className={styles.formGroup}>
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={bookingForm.name}
                                        onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={bookingForm.email}
                                        onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Mobile Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={bookingForm.mobile}
                                        onChange={e => setBookingForm({ ...bookingForm, mobile: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Company/Business Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={bookingForm.company_name}
                                        onChange={e => setBookingForm({ ...bookingForm, company_name: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Notes</label>
                                    <textarea
                                        rows={3}
                                        value={bookingForm.notes}
                                        onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    />
                                </div>

                                <button
                                    onClick={handleBook}
                                    disabled={bookingStatus === 'submitting'}
                                    className={styles.submitButton}
                                >
                                    {bookingStatus === 'submitting' ? 'Scheduling...' : 'Schedule Event'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Toaster />
        </div>
    );
}
