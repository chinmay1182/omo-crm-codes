'use client';

import React, { useState } from 'react';
import styles from './ServiceSettingsModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faTrash, faTag } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface ServiceTag {
  id: string;
  name: string;
  type: 'service_name' | 'service_category';
}

interface ServiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  serviceTags: ServiceTag[];
}

const ServiceSettingsModal: React.FC<ServiceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  serviceTags
}) => {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localServiceTags, setLocalServiceTags] = useState<ServiceTag[]>(serviceTags);

  const serviceNameTags = localServiceTags.filter(tag => tag.type === 'service_name');
  const serviceCategoryTags = localServiceTags.filter(tag => tag.type === 'service_category');

  // Update local tags when props change
  React.useEffect(() => {
    setLocalServiceTags(serviceTags);
  }, [serviceTags]);

  const refreshTags = async () => {
    try {
      const response = await fetch('/api/service-tags');
      if (response.ok) {
        const data = await response.json();
        setLocalServiceTags(data);
      }
    } catch (error) {
      console.error('Error refreshing tags:', error);
    }
  };

  const handleAddServiceName = async () => {
    if (!newServiceName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/service-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newServiceName.trim(),
          type: 'service_name'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add service name');
      }

      toast.success('Service name added successfully');
      setNewServiceName('');
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add service name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddServiceCategory = async () => {
    if (!newServiceCategory.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/service-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newServiceCategory.trim(),
          type: 'service_category'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add service category');
      }

      toast.success('Service category added successfully');
      setNewServiceCategory('');
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add service category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Are you sure you want to delete "${tagName}"?`)) return;

    try {
      const response = await fetch(`/api/service-tags/${tagId}`, {
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
          <h2 className={styles.modalTitle}>Service Settings</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.sectionsContainer}>
            {/* Service Names Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Service Names
              </h3>

              <div className={styles.addItemContainer}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Add new service name..."
                    className={styles.input}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddServiceName()}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddServiceName}
                  className={styles.addButton}
                  disabled={!newServiceName.trim() || isSubmitting}
                >
                  <i className="fa-light fa-plus"></i>
                </button>
              </div>

              <div className={styles.tagsList}>
                {serviceNameTags.length === 0 ? (
                  <p className={styles.emptyMessage}>No service names added yet</p>
                ) : (
                  serviceNameTags.map((tag) => (
                    <div key={tag.id} className={styles.tag}>
                      <span className={styles.tagText}>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className={styles.removeButton}
                        title="Delete tag"
                      >
                        <span style={{ fontSize: '12px', fontWeight: '400' }}>Delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Service Categories Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Service Categories
              </h3>

              <div className={styles.addItemContainer}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    placeholder="Add new service category..."
                    className={styles.input}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddServiceCategory()}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddServiceCategory}
                  className={styles.addButton}
                  disabled={!newServiceCategory.trim() || isSubmitting}
                >
                  <i className="fa-light fa-plus"></i>
                </button>
              </div>

              <div className={styles.tagsList}>
                {serviceCategoryTags.length === 0 ? (
                  <p className={styles.emptyMessage}>No service categories added yet</p>
                ) : (
                  serviceCategoryTags.map((tag) => (
                    <div key={tag.id} className={styles.tag}>
                      <span className={styles.tagText}>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className={styles.removeButton}
                        title="Delete tag"
                      >
                        <span style={{ fontSize: '12px', fontWeight: '400' }}>Delete</span>
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
              className={styles.cancelButton}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSettingsModal;