'use client';

import { useState, useEffect } from 'react';
import styles from './styles.module.css';
import Skeleton from '@/app/components/ui/Skeleton';

interface TodayData {
  leads: any[];
  tasks: any[];
  meetings: any[];
  emails: any[];
  notes: any[];
  activities: any[];
}

export default function TodayPage() {
  const [data, setData] = useState<TodayData>({
    leads: [],
    tasks: [],
    meetings: [],
    emails: [],
    notes: [],
    activities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all today's data in parallel
      const [leadsRes, tasksRes, meetingsRes, emailsRes, notesRes, activitiesRes] = await Promise.all([
        fetch(`/api/leads?date=${today}`),
        fetch(`/api/companies/tasks/all?date=${today}`),
        fetch(`/api/companies/meetings/all?date=${today}`),
        fetch(`/api/gmail/fetch?date=${today}`),
        fetch(`/api/companies/notes/all?date=${today}`),
        fetch(`/api/companies/activities/all?date=${today}`)
      ]);

      const [leads, tasks, meetings, emails, notes, activities] = await Promise.all([
        leadsRes.ok ? leadsRes.json() : [],
        tasksRes.ok ? tasksRes.json() : [],
        meetingsRes.ok ? meetingsRes.json() : [],
        emailsRes.ok ? emailsRes.json() : [],
        notesRes.ok ? notesRes.json() : [],
        activitiesRes.ok ? activitiesRes.json() : []
      ]);

      setData({
        leads: leads || [],
        tasks: tasks || [],
        meetings: meetings || [],
        emails: emails || [],
        notes: notes || [],
        activities: activities || []
      });
    } catch (err) {
      setError('Failed to load today\'s data');
      console.error('Error fetching today\'s data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width={300} height={40} style={{ marginBottom: '10px' }} />
          <Skeleton width={200} height={24} />
        </div>

        {/* Summary Cards Skeleton */}
        <div className={styles.summaryGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.summaryCard}>
              <Skeleton width={50} height={50} style={{ borderRadius: '12px' }} />
              <div className={styles.cardContent} style={{ width: '100%', marginLeft: '16px' }}>
                <Skeleton width={60} height={32} style={{ marginBottom: '8px' }} />
                <Skeleton width={100} height={20} />
              </div>
            </div>
          ))}
        </div>

        {/* Sections Skeleton */}
        <div className={styles.contentGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.section}>
              <div className={styles.sectionHeader}>
                <Skeleton width={200} height={28} />
              </div>
              <div className={styles.sectionContent}>
                {[1, 2, 3].map((j) => (
                  <div key={j} className={styles.item}>
                    <Skeleton width={40} height={40} style={{ borderRadius: '50%', marginRight: '16px' }} />
                    <div className={styles.itemContent} style={{ width: '100%' }}>
                      <Skeleton width="60%" height={20} style={{ marginBottom: '8px' }} />
                      <Skeleton width="90%" height={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Today's Overview</h1>
        <p className={styles.date}>{todayDate}</p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={`${styles.cardIcon} ${styles.iconLeads}`}>
            <i className="fa-light fa-user-plus"></i>
          </div>
          <div className={styles.cardContent}>
            <h3>{data.leads.length}</h3>
            <p>New Leads</p>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={`${styles.cardIcon} ${styles.iconTasks}`}>
            <i className="fa-light fa-tasks"></i>
          </div>
          <div className={styles.cardContent}>
            <h3>{data.tasks.filter(task => task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString()).length}</h3>
            <p>Tasks Due</p>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={`${styles.cardIcon} ${styles.iconMeetings}`}>
            <i className="fa-light fa-calendar-check"></i>
          </div>
          <div className={styles.cardContent}>
            <h3>{data.meetings.filter(meeting => new Date(meeting.start_time).toDateString() === new Date().toDateString()).length}</h3>
            <p>Meetings</p>
          </div>
        </div>

        <div className={styles.summaryCard}>

          <div className={`${styles.cardIcon} ${styles.iconEmails}`}>
            <i className="fa-light fa-envelope"></i>
          </div>
          <div className={styles.cardContent}>
            <h3>{data.emails.length}</h3>
            <p>Emails</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Today's Tasks */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <i className="fa-light fa-tasks"></i>
              Tasks Due Today
            </h2>
          </div>
          <div className={styles.sectionContent}>
            {data.tasks.filter(task => task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString()).length > 0 ? (
              data.tasks
                .filter(task => task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString())
                .map(task => (
                  <div key={task.id} className={styles.item}>
                    <div className={styles.itemIcon}>
                      <i className={`fa-light fa-circle ${task.status === 'completed' ? 'fa-check-circle' : ''}`}></i>
                    </div>
                    <div className={styles.itemContent}>
                      <h4>{task.title}</h4>
                      <p>{task.description}</p>
                      <div className={styles.itemMeta}>
                        <span className={`${styles.priority} ${styles[task.priority]}`}>{task.priority}</span>
                        <span className={`${styles.status} ${styles[task.status]}`}>{task.status}</span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className={styles.emptyState}>No tasks due today</div>
            )}
          </div>
        </div>

        {/* Today's Meetings */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <i className="fa-light fa-calendar-check"></i>
              Today's Meetings
            </h2>
          </div>
          <div className={styles.sectionContent}>
            {data.meetings.filter(meeting => new Date(meeting.start_time).toDateString() === new Date().toDateString()).length > 0 ? (
              data.meetings
                .filter(meeting => new Date(meeting.start_time).toDateString() === new Date().toDateString())
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map(meeting => (
                  <div key={meeting.id} className={styles.item}>
                    <div className={styles.itemIcon}>
                      <i className="fa-light fa-calendar"></i>
                    </div>
                    <div className={styles.itemContent}>
                      <h4>{meeting.title}</h4>
                      <p>{meeting.description}</p>
                      <div className={styles.itemMeta}>
                        <span className={styles.time}>
                          {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                        </span>
                        {meeting.location && <span className={styles.location}>{meeting.location}</span>}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className={styles.emptyState}>No meetings scheduled today</div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <i className="fa-light fa-user-plus"></i>
              Recent Leads
            </h2>
          </div>
          <div className={styles.sectionContent}>
            {data.leads.length > 0 ? (
              data.leads.slice(0, 5).map(lead => (
                <div key={lead.id} className={styles.item}>
                  <div className={styles.itemIcon}>
                    <i className="fa-light fa-user"></i>
                  </div>
                  <div className={styles.itemContent}>
                    <h4>{lead.assignment_name}</h4>
                    <p>{lead.contact_name} - {lead.company_name}</p>
                    <div className={styles.itemMeta}>
                      <span className={`${styles.priority} ${styles[lead.priority]}`}>{lead.priority}</span>
                      <span className={styles.stage}>{lead.stage}</span>
                      {lead.amount && <span className={styles.amount}>₹{lead.amount.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No recent leads</div>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <i className="fa-light fa-clock"></i>
              Recent Activities
            </h2>
          </div>
          <div className={styles.sectionContent}>
            {data.activities.length > 0 ? (
              data.activities.slice(0, 10).map(activity => (
                <div key={activity.id} className={styles.item}>
                  <div className={styles.itemIcon}>
                    <i className={`fa-light ${getActivityIcon(activity.type)}`}></i>
                  </div>
                  <div className={styles.itemContent}>
                    <h4>{activity.description}</h4>
                    <div className={styles.itemMeta}>
                      <span className={styles.time}>{formatTime(activity.created_at)}</span>
                      <span className={styles.type}>{activity.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No recent activities</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'task_created':
    case 'task_updated':
      return 'fa-tasks';
    case 'meeting_scheduled':
    case 'meeting_updated':
      return 'fa-calendar';
    case 'note_added':
      return 'fa-note-sticky';
    case 'file_uploaded':
      return 'fa-file';
    case 'location_added':
      return 'fa-map-marker';
    default:
      return 'fa-circle';
  }
}