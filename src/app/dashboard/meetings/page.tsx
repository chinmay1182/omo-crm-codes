
'use client';

import { useState, useEffect } from 'react';
import styles from './meetings.module.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import toast from 'react-hot-toast';
import AccessDeniedTemplate from '@/app/components/ui/AccessDeniedTemplate';
import Image from 'next/image';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_notes: string | null; // Separate field for notes taken during meeting
  start_time: string; // ISO String from API
  end_time: string;
  location: string | null;
  participants: string | null;
  meeting_link: string | null;
  google_meet_link?: string | null; // Legacy
  company_name: string;
  type: 'online' | 'offline';
  status: string;
  client_name?: string;
}

import { usePermission } from '@/app/hooks/usePermission';

export default function MeetingsPage() {
  const { hasPermission, isModuleEnabled } = usePermission();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  if (!loading && !isModuleEnabled('meetings')) {
    return (
      <AccessDeniedTemplate moduleName="Meetings" />
    );
  }
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(new Date());

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    type: 'online',
    location: '',
    meeting_link: '',
    client_email: '',
    client_name: '',
    duration: 60,
    autoGenerate: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingNotes, setMeetingNotes] = useState('');

  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      let url = '/api/companies/meetings/all';

      // Only filter by date if in calendar view
      if (activeTab === 'calendar') {
        const localDateString = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
        url += '?date=' + localDateString;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [date, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        if (!hasPermission('meetings', 'edit')) {
          toast.error('Permission denied');
          return;
        }
        // Update existing meeting
        const startTimeUTC = new Date(formData.start_time).toISOString();
        const endTimeUTC = new Date(new Date(formData.start_time).getTime() + formData.duration * 60000).toISOString();

        const res = await fetch(`/api/companies/meetings/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            start_time: startTimeUTC,
            end_time: endTimeUTC
          })
        });

        if (res.ok) {
          toast.success('Meeting Updated');
          setShowModal(false);
          setEditingId(null);
          fetchMeetings();
          resetForm();
        } else {
          toast.error('Failed to update meeting');
        }
      } else {
        if (!hasPermission('meetings', 'create')) {
          toast.error('Permission denied');
          return;
        }
        // Create New Meeting
        const startTimeUTC = new Date(formData.start_time).toISOString();

        const res = await fetch('/api/meetings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            start_time: startTimeUTC
          })
        });

        if (res.ok) {
          const meeting = await res.json();

          if (formData.type === 'online' && formData.autoGenerate) {
            const authRes = await fetch(`/api/google/meet-auth-url?meetingId=${meeting.id}`);
            const { url } = await authRes.json();
            if (url) {
              window.location.href = url;
              return;
            } else {
              toast.error('Failed to generate Google Link');
            }
          }

          toast.success('Meeting Scheduled & Invite Sent!');
          setShowModal(false);
          fetchMeetings();
          resetForm();
        } else {
          toast.error('Failed to schedule meeting');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Error saving meeting');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPermission('meetings', 'delete')) {
      toast.error('Permission denied');
      return;
    }
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const res = await fetch(`/api/companies/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Meeting deleted');
        fetchMeetings();
      } else {
        toast.error('Failed to delete meeting');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error deleting meeting');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      if (!hasPermission('meetings', 'edit')) {
        toast.error('Permission denied');
        return;
      }
      if (!confirm(`Mark this meeting as ${status}?`)) return;

      const res = await fetch(`/api/companies/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success(`Meeting marked as ${status}`);
        fetchMeetings();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error updating status');
    }
  };

  const handleEdit = (meeting: Meeting, e: React.MouseEvent) => {
    if (!hasPermission('meetings', 'edit')) {
      toast.error('Permission denied');
      return;
    }
    e.stopPropagation();
    setEditingId(meeting.id);

    // Calculate duration in minutes
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);

    // Convert to local datetime string for datetime-local input
    // The datetime-local input expects format: YYYY-MM-DDTHH:mm
    const localStartISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      start_time: localStartISO,
      type: (meeting.type as any) || 'online',
      location: meeting.location || '',
      meeting_link: meeting.meeting_link || '',
      client_email: '', // Not available in list usually
      client_name: meeting.client_name || meeting.company_name || '',
      duration: duration || 60,
      autoGenerate: false
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', start_time: '', type: 'online',
      location: '', meeting_link: '', client_email: '', client_name: '', duration: 60, autoGenerate: false
    });
    setEditingId(null);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const isMeetingOngoing = (meeting: Meeting) => {
    const now = new Date();
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    return now >= start && now <= end;
  };

  const handleAddNotes = (meeting: Meeting) => {
    if (!hasPermission('meetings', 'edit')) {
      toast.error('Permission denied');
      return;
    }
    setSelectedMeeting(meeting);
    setMeetingNotes(meeting.meeting_notes || ''); // Use meeting_notes instead of description
    setShowNotesModal(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedMeeting) return;
    if (!hasPermission('meetings', 'edit')) {
      toast.error('Permission denied');
      return;
    }

    try {
      const res = await fetch(`/api/companies/meetings/${selectedMeeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_notes: meetingNotes }) // Save to meeting_notes field
      });

      if (res.ok) {
        toast.success('Notes saved successfully');
        setShowNotesModal(false);
        setSelectedMeeting(null);
        setMeetingNotes('');
        fetchMeetings();
      } else {
        toast.error('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Error saving notes');
    }
  };

  const exportToWord = () => {
    if (!selectedMeeting) return;

    const content = `
MEETING NOTES
=============

Meeting: ${selectedMeeting.title}
Date & Time: ${formatTime(selectedMeeting.start_time)} - ${formatTime(selectedMeeting.end_time)}
With: ${selectedMeeting.client_name || selectedMeeting.company_name || 'Client'}
Type: ${selectedMeeting.type}
${selectedMeeting.location ? `Location: ${selectedMeeting.location}` : ''}

AGENDA/DESCRIPTION:
${selectedMeeting.description || 'N/A'}

MEETING NOTES:
${meetingNotes || 'No notes added yet'}
    `.trim();

    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meeting_Notes_${selectedMeeting.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to Word');
  };

  const exportToExcel = () => {
    if (!selectedMeeting) return;

    const csvContent = `Meeting Notes Export\n\n` +
      `Meeting,${selectedMeeting.title}\n` +
      `Date & Time,${formatTime(selectedMeeting.start_time)} - ${formatTime(selectedMeeting.end_time)}\n` +
      `With,${selectedMeeting.client_name || selectedMeeting.company_name || 'Client'}\n` +
      `Type,${selectedMeeting.type}\n` +
      `${selectedMeeting.location ? `Location,${selectedMeeting.location}\n` : ''}` +
      `\nAgenda/Description\n"${(selectedMeeting.description || 'N/A').replace(/"/g, '""')}"\n` +
      `\nMeeting Notes\n"${(meetingNotes || 'No notes added yet').replace(/"/g, '""')}"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meeting_Notes_${selectedMeeting.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to Excel (CSV)');
  };

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`${styles.navTab} ${activeTab === 'calendar' ? styles.active : ''}`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`${styles.navTab} ${activeTab === 'list' ? styles.active : ''}`}
          >
            All Meetings
          </button>
        </div>

        <div className={styles.topActions}>
          {/* Optional: Add search or filters here if needed */}
        </div>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'calendar' ? (
          <div className={styles.dashboardGrid}>
            {/* Left: List */}
            <div className={styles.meetingsList}>
              {loading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p>Loading meetings...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateImage}>
                    <Image
                      src="/pngegg.png"
                      alt="No Meetings"
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <p className={styles.emptyTitle}>No meetings scheduled</p>
                  <p className={styles.emptySubtitle}>Click the + button to schedule your first meeting!</p>
                </div>
              ) : (
                meetings.map(meeting => (
                  <div key={meeting.id} className={styles.meetingCard}>
                    <div className={styles.meetingHeader}>
                      <div>
                        <h3 className={styles.meetingTitle}>{meeting.title}</h3>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          with {meeting.client_name || meeting.company_name || 'Client'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span className={`${styles.meetingTypeBadge} ${styles[meeting.type || 'online']}`}>
                          {meeting.type || 'Online'}
                        </span>
                        {meeting.status && meeting.status !== 'scheduled' && (
                          <span className={`${styles.meetingTypeBadge} ${styles[meeting.status]}`}>
                            {meeting.status}
                          </span>
                        )}
                      </div>
                      <div className={styles.cardActions}>
                        {isMeetingOngoing(meeting) && hasPermission('meetings', 'edit') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddNotes(meeting); }}
                            className={styles.actionButton}
                            title="Add Notes"
                          >
                            Notes
                          </button>
                        )}
                        {(!meeting.status || meeting.status === 'scheduled') && hasPermission('meetings', 'edit') && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(meeting.id, 'completed'); }} className={styles.actionButton} title="Mark as Complete">
                              <i className="fa-light fa-check-circle" style={{ color: 'green' }}></i>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(meeting.id, 'cancelled'); }} className={styles.actionButton} title="Cancel Meeting">
                              <i className="fa-light fa-ban" style={{ color: 'red' }}></i>
                            </button>
                          </>
                        )}
                        {hasPermission('meetings', 'edit') && (
                          <button onClick={(e) => handleEdit(meeting, e)} className={styles.editButton} title="Edit">
                            Edit
                          </button>
                        )}
                        {hasPermission('meetings', 'delete') && (
                          <button onClick={(e) => handleDelete(meeting.id, e)} className={styles.deleteButton} title="Delete">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.meetingTime}>
                      <i className="fa-light fa-clock"></i>
                      {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                    </div>

                    {meeting.description && <p className={styles.meetingDescription}>{meeting.description}</p>}

                    {(meeting.meeting_link || meeting.google_meet_link) && meeting.type !== 'offline' && (
                      <a href={meeting.meeting_link || meeting.google_meet_link || '#'} target="_blank" className={styles.meetLink}>
                        <i className="fa-brands fa-google"></i> Join Meeting
                      </a>
                    )}

                    {meeting.type === 'offline' && meeting.location && (
                      <div style={{ fontSize: '14px', color: '#555' }}>
                        <i className="fa-light fa-map-marker-alt"></i> {meeting.location}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Right: Calendar */}
            <div className={styles.calendarWrapper}>
              <Calendar
                onChange={(val) => setDate(val as Date)}
                value={date}
              />
              <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                Selected: {date.toDateString()}
              </div>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading meetings...</p>
              </div>
            ) : meetings.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateImage}>
                  <Image
                    src="/pngegg.png"
                    alt="No Meetings"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <p className={styles.emptyTitle}>No meetings found</p>
                <p className={styles.emptySubtitle}>Click the + button to schedule your first meeting!</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Date & Time</th>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map(meeting => (
                      <tr key={meeting.id}>
                        <td>
                          <div style={{ fontWeight: 300, color: '#1a1a1a' }}>{meeting.title}</div>
                          <div style={{ fontSize: '14px', color: '#666', marginTop: '2px', fontWeight: 300 }}>{meeting.type}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 300 }}>{new Date(meeting.start_time).toLocaleDateString()}</div>
                          <div style={{ fontSize: '14px', color: '#666', fontWeight: 300 }}>
                            {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 300 }}>{meeting.client_name || meeting.company_name || 'Client'}</div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[meeting.status || 'scheduled'] || ''}`}>
                            {meeting.status || 'Scheduled'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {hasPermission('meetings', 'edit') && (
                              <button
                                onClick={() => handleAddNotes(meeting)}
                                className={styles.actionButton}
                                title="View/Edit Notes"
                              >
                                Notes
                              </button>
                            )}
                            {hasPermission('meetings', 'edit') && (
                              <button onClick={(e) => handleEdit(meeting, e)} className={styles.editButton} title="Edit">
                                Edit
                              </button>
                            )}
                            {hasPermission('meetings', 'delete') && (
                              <button onClick={(e) => handleDelete(meeting.id, e)} className={styles.deleteButton} title="Delete">
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB for Schedule Meeting */}
      {hasPermission('meetings', 'create') && (
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className={styles.fab}
          title="Schedule Meeting"
        >
          <i className="fa-light fa-plus"></i>
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? 'Edit Meeting' : 'Schedule New Meeting'}</h2>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn} type="button">
                <i className="fa-light fa-xmark"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} id="meetingForm">
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
                  <input required className={styles.input} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Meeting Topic" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Date & Time</label>
                    <input
                      required
                      type="datetime-local"
                      className={styles.input}
                      value={formData.start_time}
                      onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}

                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Duration (min)</label>
                    <input type="number" className={styles.input} value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Type</label>
                  <select className={styles.select} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                    <option value="online">Online (Video Call)</option>
                    <option value="offline">Offline (In Person)</option>
                  </select>
                </div>

                {formData.type === 'online' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Link Options</label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                        <input type="radio" name="linkOption" checked={!formData.autoGenerate} onChange={() => setFormData({ ...formData, autoGenerate: false })} />
                        Manual Link
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                        <input type="radio" name="linkOption" checked={formData.autoGenerate} onChange={() => setFormData({ ...formData, autoGenerate: true })} />
                        Auto-generate Google Meet
                      </label>
                    </div>

                    {!formData.autoGenerate ? (
                      <input className={styles.input} value={formData.meeting_link} onChange={e => setFormData({ ...formData, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." />
                    ) : (
                      <div style={{ fontSize: '13px', color: '#155724', background: '#d4edda', padding: '8px', borderRadius: '4px' }}>
                        <i className="fa-brands fa-google"></i> You will be redirected to Google to create the meeting link after saving.
                      </div>
                    )}
                  </div>
                )}

                {formData.type === 'offline' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Location / Address</label>
                    <input className={styles.input} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Office Address or Venue" />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Client Name (Optional)</label>
                  <input className={styles.input} value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Client Email (for Invite)</label>
                  <input type="email" className={styles.input} value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} placeholder="client@example.com" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea className={styles.textarea} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </form>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" form="meetingForm" className={styles.submitBtn}>{editingId ? 'Update' : 'Schedule'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedMeeting && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Meeting Notes</h2>
              <button className={styles.closeBtn} onClick={() => setShowNotesModal(false)}>                <i className="fa-light fa-xmark"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{selectedMeeting.title}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {formatTime(selectedMeeting.start_time)} - {formatTime(selectedMeeting.end_time)}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  with {selectedMeeting.client_name || selectedMeeting.company_name || 'Client'}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Notes / Description</label>
                <textarea
                  className={styles.textarea}
                  rows={8}
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  placeholder="Add meeting notes, discussion points, action items..."
                />
              </div>

              <div className={styles.modalActions}>
                <div style={{ display: 'flex', gap: '8px', marginRight: 'auto' }}>
                  <button
                    type="button"
                    onClick={exportToWord}
                    style={{
                      background: 'rgba(21, 66, 109, 0.1)',
                      color: '#15426d',
                      border: 'none',
                      padding: '0.6rem ',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontFamily: 'Open Sauce One',
                      fontWeight: 300,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(21, 66, 109, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(21, 66, 109, 0.1)'}
                  >
                    Export to Word
                  </button>
                  <button
                    type="button"
                    onClick={exportToExcel}
                    style={{
                      background: 'rgba(17, 164, 84, 0.1)',
                      color: '#11a454',
                      border: 'none',
                      padding: '0.6rem ',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontFamily: 'Open Sauce One',
                      fontWeight: 300,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(17, 164, 84, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(17, 164, 84, 0.1)'}
                  >
                    Export to Excel
                  </button>
                </div>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowNotesModal(false)}>Cancel</button>
                <button type="button" className={styles.submitBtn} onClick={handleSaveNotes}>Save Notes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}