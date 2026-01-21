
"use client";

import { useState, useEffect } from 'react';
import { format, addDays, startOfToday, isSameDay, addMinutes, parseISO } from 'date-fns';
import { useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

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
            <div style={{
                maxWidth: '600px', margin: '60px auto', padding: '40px',
                background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                textAlign: 'center', fontFamily: 'sans-serif'
            }}>
                <img src="/consolegal.jpeg" alt="Logo" style={{ height: '40px', marginBottom: '24px', opacity: 0.8 }} />

                <div style={{
                    width: '60px', height: '60px', background: '#ecfdf5', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                    color: '#059669', fontSize: '30px'
                }}>
                    ✓
                </div>

                <h2 style={{ fontSize: '24px', color: '#111827', marginBottom: '10px' }}>Booking Scheduled</h2>
                <p style={{ color: '#6b7280', fontSize: '16px' }}>You are scheduled with <strong style={{ color: '#374151' }}>{eventType.title}</strong></p>

                <div style={{ border: '1px solid #e5e7eb', padding: '24px', margin: '30px 0 0', borderRadius: '12px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '18px' }}>📅</span>
                        <div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{format(selectedDate, 'EEEE, MMMM do, yyyy')}</div>
                            <div style={{ color: '#6b7280', fontSize: '14px' }}>{selectedTime} ({eventType.duration} mins)</div>
                        </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: '12px 0 0 30px' }}>A calendar intimation has been sent to your email address.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'
        }}>
            <div style={{
                display: 'flex', maxWidth: '1000px', width: '90%', background: 'white',
                borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden',
                flexDirection: 'row', minHeight: '500px'
            }}>
                {/* Left Panel: Details */}
                <div style={{ flex: 1, padding: '30px', borderRight: '1px solid #f0f0f0', background: '#fafafa' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <img src="/consolegal.jpeg" alt="Consolegal Logo" style={{ height: '40px', objectFit: 'contain' }} />
                    </div>

                    <p
                        style={{
                            color: '#666', fontWeight: 600, fontSize: '13px',
                            letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px',
                            display: 'inline-block'
                        }}
                    >
                        {eventType.header_text || 'CONSOLEGAL CONSULTATION'}
                    </p>

                    <h1 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>{eventType.title}</h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#555', marginBottom: '24px', fontSize: '15px' }}>
                        <i className="fa-regular fa-clock"></i>
                        <span style={{ fontWeight: 500 }}>{eventType.duration} min</span>
                    </div>

                    {eventType.description && (
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                            <p style={{ color: '#4a4a4a', lineHeight: '1.6', fontSize: '15px', margin: 0 }}>{eventType.description}</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Picker */}
                <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '20px' }}>Select a Date & Time</h3>

                    {!selectedTime ? (
                        <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
                            {/* Date List */}
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', borderRight: '1px solid #f0f0f0', paddingRight: '10px' }}>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {days.map(day => (
                                        <button
                                            key={day.toISOString()}
                                            onClick={() => setSelectedDate(day)}
                                            style={{
                                                padding: '12px',
                                                background: isSameDay(day, selectedDate) ? '#e6f0ff' : 'transparent',
                                                border: isSameDay(day, selectedDate) ? '1px solid #0069ff' : '1px solid transparent',
                                                borderRadius: '6px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                color: isSameDay(day, selectedDate) ? '#0069ff' : '#333',
                                                fontWeight: isSameDay(day, selectedDate) ? 600 : 400
                                            }}
                                        >
                                            {format(day, 'EEE, d MMM yyyy')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time List */}
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {generateSlots().map(slot => (
                                        <button
                                            key={slot.time}
                                            onClick={() => !slot.isPast && setSelectedTime(slot.time)}
                                            disabled={slot.isPast}
                                            style={{
                                                padding: '10px',
                                                border: slot.isPast ? '1px solid #d1d5db' : '1px solid #0069ff',
                                                background: slot.isPast ? '#f3f4f6' : 'white',
                                                color: slot.isPast ? '#9ca3af' : '#0069ff',
                                                borderRadius: '4px',
                                                cursor: slot.isPast ? 'not-allowed' : 'pointer',
                                                fontWeight: 600,
                                                transition: 'all 0.2s',
                                                opacity: slot.isPast ? 0.6 : 1
                                            }}
                                            onMouseOver={(e) => {
                                                if (!slot.isPast) {
                                                    e.currentTarget.style.background = '#0069ff';
                                                    e.currentTarget.style.color = 'white';
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                if (!slot.isPast) {
                                                    e.currentTarget.style.background = 'white';
                                                    e.currentTarget.style.color = '#0069ff';
                                                }
                                            }}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <button
                                onClick={() => setSelectedTime(null)}
                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                ← Back to times
                            </button>

                            <h4 style={{ marginBottom: '15px' }}>Enter Details</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={bookingForm.name}
                                        onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={bookingForm.email}
                                        onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Mobile Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={bookingForm.mobile}
                                        onChange={e => setBookingForm({ ...bookingForm, mobile: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Company/Business Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={bookingForm.company_name}
                                        onChange={e => setBookingForm({ ...bookingForm, company_name: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Notes</label>
                                    <textarea
                                        rows={3}
                                        value={bookingForm.notes}
                                        onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    />
                                </div>

                                <button
                                    onClick={handleBook}
                                    disabled={bookingStatus === 'submitting'}
                                    style={{
                                        marginTop: '10px', padding: '12px', background: '#0069ff', color: 'white',
                                        border: 'none', borderRadius: '40px', fontWeight: 600, cursor: 'pointer', fontSize: '16px'
                                    }}
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
