'use client';

import { useState, useEffect } from 'react';
import styles from './activitylist.module.css';
import Skeleton from '../ui/Skeleton';

interface CompanyActivity {
  id: string;
  type: 'task' | 'note' | 'file' | 'meeting';
  description: string;
  created_at: string;
  updated_at: string;
}

interface ActivityListProps {
  companyId?: string;
  contactId?: string;
}

export default function ActivityList({ companyId, contactId }: ActivityListProps) {
  const [activities, setActivities] = useState<CompanyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        let url = '';

        if (companyId) {
          url = `/api/companies/activities?companyId=${companyId}`;
        } else if (contactId) {
          url = `/api/contacts/activities?contactId=${contactId}`;
        } else {
          throw new Error('Either companyId or contactId is required');
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }

        const data = await response.json();
        setActivities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    if (companyId || contactId) {
      fetchActivities();
    }
  }, [companyId, contactId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return '✅';
      case 'note': return '📝';
      case 'file': return '📁';
      case 'meeting': return '📅';
      case 'email': return '📧';
      case 'whatsapp': return '💬';
      case 'call': return '📞';
      default: return '🔹';
    }
  };

  if (loading) {
    return (
      <div className={styles.activityListContainer}>
        <ul className={styles.activityList}>
          {[1, 2, 3].map((i) => (
            <li key={i} className={styles.activityItem}>
              <Skeleton width={24} height={24} style={{ marginRight: '1rem', flexShrink: 0 }} />
              <div className={styles.activityContent} style={{ width: '100%' }}>
                <div className={styles.activityHeader} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton width={80} height={20} />
                  <Skeleton width={100} height={20} />
                </div>
                <Skeleton width="100%" height={16} />
                <Skeleton width="80%" height={16} style={{ marginTop: '4px' }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.activityListContainer}>
      {activities.length === 0 ? (
        <p className={styles.noActivities}>No activities yet.</p>
      ) : (
        <ul className={styles.activityList}>
          {activities.map((activity) => (
            <li key={`${activity.type}-${activity.id}`} className={styles.activityItem}>
              <span className={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
              <div className={styles.activityContent}>
                <div className={styles.activityHeader}>
                  <span className={styles.activityType}>{activity.type}</span>
                  <span className={styles.activityDate}>
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.activityDescription}>{activity.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}