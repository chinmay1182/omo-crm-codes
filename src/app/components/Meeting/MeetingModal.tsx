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
  const [endTime, setEndTime] = useState(initialEndTime);
  const [location, setLocation] = useState(initialLocation);
  const [participants, setParticipants] = useState(initialParticipants);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createGoogleMeet, setCreateGoogleMeet] = useState(false);
  const [, setGoogleAuthUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form fields to initial values on modal open
      setTitle(initialTitle);
      setDescription(initialDescription);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setLocation(initialLocation);
      setParticipants(initialParticipants);
      setError('');
      setIsSubmitting(false);

      // Fetch Google auth URL on modal open
      const fetchAuthUrl = async () => {
        const response = await fetch('/api/google/auth-url');
        const data = await response.json();
        setGoogleAuthUrl(data.url);
      };
      fetchAuthUrl();
    }
  }, [isOpen, initialTitle, initialDescription, initialStartTime, initialEndTime, initialLocation, initialParticipants]);

  const handleSubmit = async () => {
    if (!title.trim() || !startTime || !endTime) {
      setError('Title, start time and end time are required');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let url = '';
      let bodyData = {};
      
      if (companyId) {
        url = '/api/companies/meetings';
        bodyData = {
          companyId,
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTime,
          location: location || null,
          participants: participants || null,
          createGoogleMeet,
        };
      } else if (contactId) {
        url = '/api/contacts/meetings';
        bodyData = {
          contactId,
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTime,
          location: location || null,
          participants: participants || null,
          createGoogleMeet,
        };
      } else {
        throw new Error('Either companyId or contactId is required');
      }

      const meetingResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!meetingResponse.ok) {
        throw new Error(await meetingResponse.text());
      }

      const meetingData = await meetingResponse.json();
      const pendingMeetingId = meetingData.meetingId; // assuming backend returns { meetingId: '...' }

      if (createGoogleMeet && pendingMeetingId) {
        // Fetch Google OAuth URL with pendingMeetingId
        const authUrlResponse = await fetch(`/api/google/auth-url?companyId=${companyId}`);
        const authUrlData = await authUrlResponse.json();

        if (!authUrlResponse.ok || !authUrlData.url) {
          throw new Error(authUrlData.error || 'Failed to get Google auth URL');
        }

        // Save to sessionStorage if needed, then redirect
        sessionStorage.setItem('pendingMeeting', JSON.stringify({
          meetingId: pendingMeetingId,
          companyId,
          title,
          startTime,
          endTime,
          description
        }));

        window.location.href = authUrlData.url;
        return;
      }

      onSuccess();
      resetForm();
      onClose();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setParticipants('');
    setCreateGoogleMeet(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h4>Schedule New Meeting</h4>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.meetingForm}>
            <div className={styles.formGroup}>
              <label>Title*</label>
              <input
                title='none'
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Start Time*</label>
                <input
                  title='none'
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={styles.inputField}
                />
              </div>
              <div className={styles.formGroup}>
                <label>End Time*</label>
                <input
                  title='none'
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={styles.inputField}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={createGoogleMeet}
                  onChange={(e) => setCreateGoogleMeet(e.target.checked)}
                  className={styles.checkbox}
                />
                Create Google Meet
              </label>
              {createGoogleMeet && (
                <p className={styles.note}>
                  Youll be redirected to Google to authorize calendar access
                </p>
              )}
            </div>

            {!createGoogleMeet && (
              <div className={styles.formGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={styles.inputField}
                  placeholder="Physical address or meeting link"
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                title='none'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textareaField}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Participants</label>
              <textarea
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className={styles.textareaField}
                rows={2}
                placeholder="Enter participant emails, separated by commas"
              />
            </div>

            {error && <p className={styles.errorText}>{error}</p>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !startTime || !endTime}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}
