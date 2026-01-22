'use client';

import { useState, useEffect } from 'react';
import styles from './meetingmodal.module.css';

interface MeetingModalProps {
  companyId?: string;
  contactId?: string;
  onSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
  initialParticipants?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialLocation?: string;
}

export default function MeetingModal({
  companyId,
  contactId,
  onSuccess,
  onClose,
  isOpen,
  initialParticipants = '',
  initialTitle = '',
  initialDescription = '',
  initialStartTime = '',
  initialEndTime = '',
  initialLocation = ''
}: MeetingModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [duration, setDuration] = useState(60); // Default 60 mins
  const [type, setType] = useState<'online' | 'offline'>('online');
  const [location, setLocation] = useState(initialLocation);
  const [meetingLink, setMeetingLink] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate duration if start/end times provided initially
  useEffect(() => {
    if (initialStartTime && initialEndTime) {
      const start = new Date(initialStartTime);
      const end = new Date(initialEndTime);
      const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
      if (diffMins > 0) setDuration(diffMins);
    }
  }, [initialStartTime, initialEndTime]);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setStartTime(initialStartTime);
      setLocation(initialLocation);
      setError('');
      setIsSubmitting(false);
      // Reset new fields
      setType('online');
      setMeetingLink('');
      setAutoGenerate(false);
      setClientName(initialParticipants || '');
      setClientEmail('');
    }
  }, [isOpen, initialTitle, initialDescription, initialStartTime, initialLocation, initialParticipants]);

  const handleSubmit = async () => {
    if (!title.trim() || !startTime) {
      setError('Title and Date & Time are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 60000);
      const endTimeIso = end.toISOString();

      let url = '';
      let bodyData = {};

      if (companyId) {
        url = '/api/companies/meetings';
        // Payload matching what /api/companies/meetings likely expects or should receive
        // Note: We might need to update the API endpoint to handle client_email/name/type if it doesn't already
        bodyData = {
          companyId,
          title,
          description: description || null,
          start_time: startTime, // API expects this or meeting_date
          end_time: endTimeIso,  // API likely calculates duration from this
          duration,              // Sending explicit duration too
          type,
          location: type === 'offline' ? location : null,
          meeting_link: type === 'online' ? meetingLink : null,
          createGoogleMeet: autoGenerate, // Mapping for legacy support
          client_name: clientName,
          client_email: clientEmail,
          participants: clientName // Legacy mapping
        };
      } else if (contactId) {
        url = '/api/contacts/meetings';
        bodyData = {
          contactId,
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTimeIso,
          location: type === 'offline' ? location : null,
          meeting_url: type === 'online' ? meetingLink : null, // contact_meetings uses meeting_url
          participants: clientName
          // Note: contact_meetings might not store type/duration/emails yet
        };
      } else {
        throw new Error('Either companyId or contactId is required');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      // Handle Auto-Generate Redirect
      if (type === 'online' && autoGenerate && data.meetingId) {
        // Use the generic google auth url endpoint
        // Note: The sidebar uses /api/google/meet-auth-url?meetingId=...
        // We might need to replicate that logic if we want the same flow
        const authRes = await fetch(`/api/google/meet-auth-url?meetingId=${data.meetingId}`);
        if (authRes.ok) {
          const { url } = await authRes.json();
          if (url) {
            window.location.href = url;
            return; // Redirecting, so don't close naturally
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('');
    setDuration(60);
    setType('online');
    setLocation('');
    setMeetingLink('');
    setAutoGenerate(false);
    setClientName('');
    setClientEmail('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Schedule Meeting</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-sharp fa-thin fa-xmark"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>

            {/* Title */}
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Title</label>
              <input
                type="text"
                placeholder="Meeting Topic"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Date & Time + Duration */}
            <div className={styles.formGroup}>
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1"
              />
            </div>

            {/* Type */}
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'online' | 'offline')}
                className={styles.selectInput}
              >
                <option value="online">Online (Video Call)</option>
                <option value="offline">Offline (In Person)</option>
              </select>
            </div>

            {/* Link Options (Online) */}
            {type === 'online' && (
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label>Link Options</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={!autoGenerate}
                      onChange={() => setAutoGenerate(false)}
                    />
                    Manual Link
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={autoGenerate}
                      onChange={() => setAutoGenerate(true)}
                    />
                    Auto-generate Google Meet
                  </label>
                </div>

                {!autoGenerate ? (
                  <input
                    type="text"
                    placeholder="https://meet.google.com/..."
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className={styles.linkInput}
                  />
                ) : (
                  <div className={styles.infoBox}>
                    <i className="fa-brands fa-google"></i> You will be redirected to Google to create the meeting link after saving.
                  </div>
                )}
              </div>
            )}

            {/* Location (Offline) */}
            {type === 'offline' && (
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label>Location / Address</label>
                <input
                  type="text"
                  placeholder="Office Address or Venue"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            )}

            {/* Client Details */}
            <div className={styles.formGroup}>
              <label>Client Name (Optional)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Client Email (for Invite)</label>
              <input
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Description</label>
              <textarea
                placeholder="Meeting description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && <div className={`${styles.error} ${styles.formGroupFull}`}>{error}</div>}
          </div>

          <div className={styles.formActions}>
            <button
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? 'Saving...' : 'Save Meeting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
