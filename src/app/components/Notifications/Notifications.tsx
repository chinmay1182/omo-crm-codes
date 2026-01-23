'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import styles from './Notifications.module.css';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'lead_assigned' | 'lead_updated';
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsProps {
  className?: string;
}

export default function Notifications({ className }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth(); // Needed for filtering if RLS isn't enough or for channel logic

  // Initial Fetch
  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          // Optionally filter by user_id if column exists, or just listen to all and filter if needed
          // Assuming RLS handles visibility in fetch, but subscription sees all authorized changes?
          // If notifications table has RLS, 'postgres_changes' respects it if using correct auth token,
          // but client-side supabase usually listens to public changes unless we use secure channels.
          // For now, let's just listen to INSERT and refetch to be safe/secure.
        },
        (payload) => {
          // New notification inserted!
          // Ideally we check if it belongs to us.
          // Since payload has the new record, we can just add it if it matches our user logic.
          // But simpliest robust way: just refetch or increment.
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, is_read: true })
      });

      if (!response.ok) {
        // Revert if failed (optional, but good practice)
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?action=mark-all-read', {
        method: 'PATCH'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={`${styles.notificationsContainer} ${className}`} ref={dropdownRef}>
      <button
        className={styles.notificationButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <i className="fa-sharp fa-thin fa-comment" style={{ fontSize: '20px' }}></i>
        {unreadCount > 0 && (
          <span className={styles.badge}></span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllButton}
                onClick={markAllAsRead}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.notificationsList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {notification.title}
                      {!notification.is_read && (
                        <button
                          className={styles.markReadButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          aria-label="Mark as read"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      )}
                    </div>
                    <div className={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div className={styles.notificationTime}>
                      {formatTimeAgo(notification.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Optional Footer 
          <div className={styles.dropdownFooter}>
            <button className={styles.viewAllButton}>
              View All
            </button>
          </div>
          */}
        </div>
      )}
    </div>
  );
}