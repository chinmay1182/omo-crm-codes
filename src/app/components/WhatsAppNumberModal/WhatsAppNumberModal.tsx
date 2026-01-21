'use client';

import React, { useState, useEffect } from 'react';
import styles from './WhatsAppNumberModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface WhatsAppNumber {
  id: string;
  number: string;
  display_name: string;
  is_active: boolean;
  is_default: boolean;
  api_key: string | null;
  webhook_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

interface WhatsAppNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  number?: WhatsAppNumber | null;
}

const WhatsAppNumberModal: React.FC<WhatsAppNumberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  number
}) => {
  const [formData, setFormData] = useState({
    number: '',
    display_name: '',
    is_active: true,
    is_default: false,
    api_key: '',
    webhook_url: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (number) {
      setFormData({
        number: number.number,
        display_name: number.display_name,
        is_active: number.is_active,
        is_default: number.is_default,
        api_key: number.api_key || '',
        webhook_url: number.webhook_url || '',
        status: number.status
      });
    } else {
      resetForm();
    }
  }, [number, isOpen]);

  const resetForm = () => {
    setFormData({
      number: '',
      display_name: '',
      is_active: true,
      is_default: false,
      api_key: '',
      webhook_url: '',
      status: 'active'
    });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.number.trim()) {
      setError('WhatsApp number is required');
      return;
    }
    
    if (!formData.display_name.trim()) {
      setError('Display name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const url = number ? `/api/whatsapp-numbers/${number.id}` : '/api/whatsapp-numbers';
      const method = number ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save WhatsApp number');
      }

      toast.success(number ? 'WhatsApp number updated successfully' : 'WhatsApp number added successfully');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save WhatsApp number');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>{number ? 'Edit WhatsApp Number' : 'Add WhatsApp Number'}</h2>
          
            <i onClick={onClose} className="fa-light fa-xmark"></i>

       
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>WhatsApp Number *</label>
              <input
                type="tel"
                name="number"
                value={formData.number}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="+1234567890"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Display Name *</label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Main WhatsApp"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>API Key</label>
              <input
                type="text"
                name="api_key"
                value={formData.api_key}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Your WhatsApp API key"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Webhook URL</label>
              <input
                type="url"
                name="webhook_url"
                value={formData.webhook_url}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="https://your-domain.com/webhook"
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <span>Active</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleInputChange}
              />
              <span>Set as Default</span>
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (number ? 'Update Number' : 'Add Number')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppNumberModal;