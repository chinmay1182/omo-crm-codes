'use client';

import React, { useState, useEffect } from 'react';
import styles from './InclusionExclusionModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface InclusionExclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  serviceId: string;
}

interface InclusionExclusion {
  inclusions: string[];
  exclusions: string[];
}

const InclusionExclusionModal: React.FC<InclusionExclusionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  serviceId
}) => {
  const [data, setData] = useState<InclusionExclusion>({
    inclusions: [],
    exclusions: []
  });
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && serviceId) {
      fetchInclusionsExclusions();
    }
  }, [isOpen, serviceId]);

  const fetchInclusionsExclusions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/services/${serviceId}/inclusions-exclusions`);
      if (response.ok) {
        const result = await response.json();
        setData({
          inclusions: result.inclusions || [],
          exclusions: result.exclusions || []
        });
      } else {
        toast.error('Failed to fetch inclusions and exclusions');
      }
    } catch (error) {
      console.error('Error fetching inclusions/exclusions:', error);
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setData(prev => ({
        ...prev,
        inclusions: [...prev.inclusions, newInclusion.trim()]
      }));
      setNewInclusion('');
    }
  };

  const removeInclusion = (index: number) => {
    setData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }));
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      setData(prev => ({
        ...prev,
        exclusions: [...prev.exclusions, newExclusion.trim()]
      }));
      setNewExclusion('');
    }
  };

  const removeExclusion = (index: number) => {
    setData(prev => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/services/${serviceId}/inclusions-exclusions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update inclusions and exclusions');
      }

      toast.success('Inclusions and exclusions updated successfully');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage Inclusions & Exclusions</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-light fa-xmark"></i>

          </button>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalBody}>
            <div className={styles.sectionsContainer}>
              {/* Inclusions Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Inclusions</h3>

                <div className={styles.addItemContainer}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={newInclusion}
                      onChange={(e) => setNewInclusion(e.target.value)}
                      placeholder="Add new inclusion..."
                      className={styles.input}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclusion())}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addInclusion}
                    className={styles.addButton}
                    disabled={!newInclusion.trim()}
                  >
                    <i className="fa-light fa-plus"></i>
                  </button>
                </div>

                <div className={styles.itemsList}>
                  {data.inclusions.length === 0 ? (
                    <p className={styles.emptyMessage}>No inclusions added yet</p>
                  ) : (
                    data.inclusions.map((inclusion, index) => (
                      <div key={index} className={styles.item}>
                        <span className={styles.itemText}>{inclusion}</span>
                        <button
                          type="button"
                          onClick={() => removeInclusion(index)}
                          className={styles.removeButton}
                          title="Delete"
                        >
                          <span style={{ fontSize: '12px', fontWeight: '400' }}>Delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Exclusions Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Exclusions</h3>

                <div className={styles.addItemContainer}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={newExclusion}
                      onChange={(e) => setNewExclusion(e.target.value)}
                      placeholder="Add new exclusion..."
                      className={styles.input}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExclusion())}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addExclusion}
                    className={styles.addButton}
                    disabled={!newExclusion.trim()}
                  >
                    <i className="fa-light fa-plus"></i>
                  </button>
                </div>

                <div className={styles.itemsList}>
                  {data.exclusions.length === 0 ? (
                    <p className={styles.emptyMessage}>No exclusions added yet</p>
                  ) : (
                    data.exclusions.map((exclusion, index) => (
                      <div key={index} className={styles.item}>
                        <span className={styles.itemText}>{exclusion}</span>
                        <button
                          type="button"
                          onClick={() => removeExclusion(index)}
                          className={styles.removeButton}
                          title="Delete"
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
                onClick={onClose}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InclusionExclusionModal;