'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import styles from './Notifications.module.css';

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

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
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
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, is_read: true })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'lead_assigned': return '👤';
      case 'lead_updated': return '📝';
      default: return 'ℹ️';
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
        {/* <FontAwesomeIcon icon={faBell} className={styles.bellIcon} /> */}
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
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''
                    }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
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

          {notifications.length > 0 && (
            <div className={styles.dropdownFooter}>
              <button className={styles.viewAllButton}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}