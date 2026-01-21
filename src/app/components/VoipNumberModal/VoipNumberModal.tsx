'use client';

import React, { useState, useEffect } from 'react';
import styles from './VoipNumberModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface VoipNumber {
  id: string;
  cli_number: string;
  display_name: string;
  provider: string;
  is_active: boolean;
  is_default: boolean;
  api_endpoint: string | null;
  api_key: string | null;
  api_secret: string | null;
  webhook_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

interface VoipNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  number?: VoipNumber | null;
}

const VoipNumberModal: React.FC<VoipNumberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  number
}) => {
  const [formData, setFormData] = useState({
    cli_number: '',
    display_name: '',
    provider: '',
    is_active: true,
    is_default: false,
    api_endpoint: '',
    api_key: '',
    api_secret: '',
    webhook_url: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (number) {
      setFormData({
        cli_number: number.cli_number,
        display_name: number.display_name,
        provider: number.provider,
        is_active: number.is_active,
        is_default: number.is_default,
        api_endpoint: number.api_endpoint || '',
        api_key: number.api_key || '',
        api_secret: number.api_secret || '',
        webhook_url: number.webhook_url || '',
        status: number.status
      });
    } else {
      resetForm();
    }
  }, [number, isOpen]);

  const resetForm = () => {
    setFormData({
      cli_number: '',
      display_name: '',
      provider: '',
      is_active: true,
      is_default: false,
      api_endpoint: '',
      api_key: '',
      api_secret: '',
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
    
    if (!formData.cli_number.trim()) {
      setError('CLI number is required');
      return;
    }
    
    if (!formData.display_name.trim()) {
      setError('Display name is required');
      return;
    }

    if (!formData.provider.trim()) {
      setError('Provider is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const url = number ? `/api/voip-numbers/${number.id}` : '/api/voip-numbers';
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
        throw new Error(errorData.error || 'Failed to save VOIP number');
      }

      toast.success(number ? 'VOIP number updated successfully' : 'VOIP number added successfully');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save VOIP number');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;  ret
urn (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>{number ? 'Edit VOIP Number' : 'Add VOIP Number'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>CLI Number *</label>
              <input
                type="tel"
                name="cli_number"
                value={formData.cli_number}
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
                placeholder="Main VOIP Line"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Provider *</label>
              <input
                type="text"
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Twilio, Vonage, etc."
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
              <label>API Endpoint</label>
              <input
                type="url"
                name="api_endpoint"
                value={formData.api_endpoint}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="https://api.provider.com/v1"
              />
            </div>

            <div className={styles.formGroup}>
              <label>API Key</label>
              <input
                type="text"
                name="api_key"
                value={formData.api_key}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Your API key"
              />
            </div>

            <div className={styles.formGroup}>
              <label>API Secret</label>
              <input
                type="password"
                name="api_secret"
                value={formData.api_secret}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Your API secret"
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
                placeholder="https://crm.consolegal.com/api/pingback"
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

export default VoipNumberModal;