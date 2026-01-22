'use client';

import React, { useState } from 'react';
import styles from './ContactTagsModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface ContactTag {
  id: string;
  name: string;
  type: 'contact_tag' | 'company_tag';
}

interface ContactTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactTags: ContactTag[];
}

const ContactTagsModal: React.FC<ContactTagsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  contactTags
}) => {
  const [newContactTag, setNewContactTag] = useState('');
  const [newCompanyTag, setNewCompanyTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localContactTags, setLocalContactTags] = useState<ContactTag[]>(contactTags);

  const contactTagsList = localContactTags.filter(tag => tag.type === 'contact_tag');
  const companyTagsList = localContactTags.filter(tag => tag.type === 'company_tag');

  // Update local tags when props change
  React.useEffect(() => {
    setLocalContactTags(contactTags);
  }, [contactTags]);

  const refreshTags = async () => {
    try {
      const response = await fetch('/api/contact-tags');
      if (response.ok) {
        const data = await response.json();
        setLocalContactTags(data);
      }
    } catch (error) {
      console.error('Error refreshing tags:', error);
    }
  };

  const handleAddContactTag = async () => {
    if (!newContactTag.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newContactTag.trim(),
          type: 'contact_tag'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add contact tag');
      }

      toast.success('Contact tag added successfully');
      setNewContactTag('');
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCompanyTag = async () => {
    if (!newCompanyTag.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCompanyTag.trim(),
          type: 'company_tag'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add company tag');
      }

      toast.success('Company tag added successfully');
      setNewCompanyTag('');
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add company tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Are you sure you want to delete "${tagName}"?`)) return;

    try {
      const response = await fetch(`/api/contact-tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }

      toast.success('Tag deleted successfully');
      await refreshTags();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Contact & Company Tags</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.sectionsContainer}>
            {/* Contact Tags Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Contact Tags
              </h3>

              <div className={styles.addItemContainer}>
                <input
                  type="text"
                  value={newContactTag}
                  onChange={(e) => setNewContactTag(e.target.value)}
                  placeholder="Add new contact tag..."
                  className={styles.tagInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddContactTag()}
                />
                <button
                  type="button"
                  onClick={handleAddContactTag}
                  className={styles.addButton}
                  disabled={!newContactTag.trim() || isSubmitting}
                >
                  Add
                </button>
              </div>

              <div className={styles.tagsList}>
                {contactTagsList.length === 0 ? (
                  <p className={styles.emptyMessage}>No contact tags added yet</p>
                ) : (
                  contactTagsList.map((tag) => (
                    <div key={tag.id} className={styles.tag}>
                      <span className={styles.tagText}>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className={styles.removeButton}
                        title="Delete tag"
                      >
                        <i className="fa-light fa-xmark"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Company Tags Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Company Tags
              </h3>

              <div className={styles.addItemContainer}>
                <input
                  type="text"
                  value={newCompanyTag}
                  onChange={(e) => setNewCompanyTag(e.target.value)}
                  placeholder="Add new company tag..."
                  className={styles.tagInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCompanyTag()}
                />
                <button
                  type="button"
                  onClick={handleAddCompanyTag}
                  className={styles.addButton}
                  disabled={!newCompanyTag.trim() || isSubmitting}
                >
                  Add
                </button>
              </div>

              <div className={styles.tagsList}>
                {companyTagsList.length === 0 ? (
                  <p className={styles.emptyMessage}>No company tags added yet</p>
                ) : (
                  companyTagsList.map((tag) => (
                    <div key={tag.id} className={styles.tag}>
                      <span className={styles.tagText}>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className={styles.removeButton}
                        title="Delete tag"
                      >
                        <i className="fa-light fa-xmark"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => {
                onSuccess(); // Call this to refresh parent component
                onClose();
              }}
              className={styles.closeModalButton}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactTagsModal;