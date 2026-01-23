'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './Reminders.module.css';

interface ReminderItem {
    type: 'task' | 'meeting' | 'note' | 'lead' | 'proposal';
    id: string;
    title: string;
    date: string; // ISO string
    isOverdue: boolean;
    isDueSoon: boolean;
    url: string;
}

export default function Reminders() {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<ReminderItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch Reminders
    useEffect(() => {
        const fetchReminders = async (isBackground = false) => {
            if (!isBackground) setIsLoading(true);
            try {
                const res = await fetch('/api/reminders');
                if (res.ok) {
                    const data = await res.json();
                    setItems(data.reminders || []);
                }
            } catch (error) {
                console.error("Error fetching reminders", error);
            } finally {
                if (!isBackground) setIsLoading(false);
            }
        };

        fetchReminders();
        // Poll every 5 seconds for "realtime" feel - pass true for background
        const interval = setInterval(() => fetchReminders(true), 5000);
        return () => clearInterval(interval);
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const groupedItems = {
        overdue: items.filter(i => i.isOverdue),
        upcoming: items.filter(i => !i.isOverdue && i.type === 'meeting' ? true : i.isDueSoon) // Show all upcoming meetings or just due soon? User said "realtime me as a remainder".
    };

    // Filter logic:
    // User wants: Notes due dates, Tasks due dates, Meetings due dates.
    // "Realtime me as a remainder" -> probably things due soon or today.
    // Logic in API will handle filtering for "Upcoming/Overdue". 
    // Here we display.

    // Sort logic? API likely sorts.

    const hasReminders = items.length > 0;

    return (
        <div className={styles.reminderWrapper} ref={wrapperRef}>
            <button
                className={styles.reminderIconBtn}
                onClick={() => setIsOpen(!isOpen)}
                title="Reminders"
            >
                <i className="fa-sharp fa-thin fa-calendar-lines"></i>                {hasReminders && <span className={styles.reminderBadge}></span>}
            </button>
            <div style={{ fontSize: '14px', fontWeight: 300, color: '#333', marginLeft: '0', cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
                Reminders
            </div>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <span>Reminders</span>
                        <span className={styles.closeParams} onClick={() => setIsOpen(false)}>
                            <i className="fa-thin fa-xmark"></i>
                        </span>
                    </div>

                    <div className={styles.content}>
                        {isLoading ? (
                            <div className={styles.emptyState}>Loading...</div>
                        ) : items.length === 0 ? (
                            <div className={styles.emptyState}>No reminders due soon.</div>
                        ) : (
                            <>
                                {/* Group by Date or Context? Users said: Notes, Tasks, Meetings */}
                                {/* Maybe just a list sorted by time is best for "Reminders" */}
                                <ul className={styles.list}>
                                    {items.map(item => (
                                        <Link href={item.url} key={`${item.type}-${item.id}`} className={styles.item} onClick={() => setIsOpen(false)}>
                                            <div className={styles.itemTitle}>{item.title}</div>
                                            <div className={styles.itemMeta}>
                                                <span className={item.isOverdue ? styles.dueUrgent : styles.dueSoon}>
                                                    {item.isOverdue ? 'Overdue: ' : 'Due: '}
                                                    {new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

