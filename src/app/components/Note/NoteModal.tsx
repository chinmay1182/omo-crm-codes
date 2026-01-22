'use client';

import { useState } from 'react';
import styles from './notemodal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

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
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add New Note</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-sharp fa-thin fa-xmark"></i>           </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Note Title</label>
              <input
                type="text"
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Content</label>
              <textarea
                placeholder="Note content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
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
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}