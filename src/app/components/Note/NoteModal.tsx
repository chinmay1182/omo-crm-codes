'use client';

import { useState } from 'react';
import styles from './notemodal.module.css';

interface NoteModalProps {
  companyId?: string;
  contactId?: string;
  onSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function NoteModal({ companyId, contactId, onSuccess, onClose, isOpen }: NoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let url = '';
      let bodyData = {};
      
      if (companyId) {
        url = '/api/companies/notes';
        bodyData = { companyId, title, content };
      } else if (contactId) {
        url = '/api/contacts/notes';
        bodyData = { contactId, title, content };
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

      onSuccess();
      setTitle('');
      setContent('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h4>Add New Note</h4>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.noteForm}>
            <input
              type="text"
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.titleInput}
            />
            <textarea
              placeholder="Note content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles.contentInput}
            />
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
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}