'use client';

import { useState, useEffect } from 'react';
import styles from './meetinglist.module.css';
import Skeleton from '../ui/Skeleton';

interface CompanyMeeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  participants: string | null;
  google_meet_link: string | null;
  created_at: string;
}

interface MeetingListProps {
  companyId?: string;
  contactId?: string;
  onEditMeeting?: (meeting: any) => void;
}

export default function MeetingList({ companyId, contactId, onEditMeeting }: MeetingListProps) {
  const [meetings, setMeetings] = useState<CompanyMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        let url = '';

        if (companyId) {
          url = `/api/companies/meetings?companyId=${companyId}`;
        } else if (contactId) {
          url = `/api/contacts/meetings?contactId=${contactId}`;
        } else {
          throw new Error('Either companyId or contactId is required');
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch meetings');
        }

        const data = await response.json();
        setMeetings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };

    if (companyId || contactId) {
      fetchMeetings();
    }
  }, [companyId, contactId]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      let url = '';
      if (companyId) {
        url = `/api/companies/meetings/${meetingId}`;
      } else if (contactId) {
        url = `/api/contacts/meetings/${meetingId}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }

      setMeetings(meetings.filter(meeting => meeting.id !== meetingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meeting');
    }
  };

  if (loading) {
    return (
      <div className={styles.meetingListContainer}>
        <ul className={styles.meetingList}>
          {[1, 2, 3].map((i) => (
            <li key={i} className={styles.meetingItem}>
              <div className={styles.meetingInfo} style={{ width: '100%' }}>
                <Skeleton width={150} height={24} style={{ marginBottom: '8px' }} />
                <Skeleton width={200} height={16} style={{ marginBottom: '8px' }} />
                <Skeleton width="80%" height={16} />
              </div>
              <div className={styles.meetingActions}>
                <Skeleton width={80} height={36} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.meetingListContainer}>
      {meetings.length === 0 ? (
        <p className={styles.noMeetings}>No meetings scheduled yet.</p>
      ) : (
        <ul className={styles.meetingList}>
          {meetings.map((meeting) => (
            <li key={meeting.id} className={styles.meetingItem}>
              <div className={styles.meetingInfo}>
                <h4 className={styles.meetingTitle}>{meeting.title}</h4>
                <div className={styles.meetingTime}>
                  <span>{formatDateTime(meeting.start_time)}</span>
                  <span> to </span>
                  <span>{formatDateTime(meeting.end_time)}</span>
                </div>
                {meeting.google_meet_link ? (
                  <p className={styles.meetingLocation}>
                    <a
                      href={meeting.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.meetLink}
                    >
                      Join Google Meet
                    </a>
                  </p>
                ) : meeting.location && (
                  <p className={styles.meetingLocation}>📍 {meeting.location}</p>
                )}
                {meeting.description && (
                  <p className={styles.meetingDescription}>{meeting.description}</p>
                )}
                {meeting.participants && (
                  <p className={styles.meetingParticipants}>
                    👥 Participants: {meeting.participants}
                  </p>
                )}
              </div>
              <div className={styles.meetingActions}>
                <button
                  onClick={() => handleDelete(meeting.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}