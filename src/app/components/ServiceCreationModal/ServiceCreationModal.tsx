'use client';

import React, { useState } from 'react';
import styles from './ServiceCreationModal.module.css';

interface ServiceCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (serviceName: string, serviceAmount: string) => void;
}

export default function ServiceCreationModal({ isOpen, onClose, onSuccess }: ServiceCreationModalProps) {
  const [formData, setFormData] = useState({
    serviceName: '',
    serviceAmount: '',
    serviceType: 'pre_engagement',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.serviceName.trim() || !formData.serviceAmount.trim()) {
        throw new Error('Service name and amount are required');
      }

      const serviceData = {
        unique_service_code: `LEAD-${Date.now()}`,
        service_name: formData.serviceName,
        service_names: [formData.serviceName],
        service_categories: ['Lead Generated'],
        service_type: formData.serviceType,
        service_tat: new Date().toISOString().split('T')[0],
        service_fee: parseFloat(formData.serviceAmount),
        professional_fee: 0,
        discount: 0,
        challan_associated: '',
        gst_amount: parseFloat(formData.serviceAmount) * 0.18,
        total_amount: parseFloat(formData.serviceAmount) * 1.18
      };

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create service');
      }

      onSuccess(formData.serviceName, (parseFloat(formData.serviceAmount) * 1.18).toString());
      
      // Reset form
      setFormData({
        serviceName: '',
        serviceAmount: '',
        serviceType: 'pre_engagement',
        description: ''
      });
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      serviceName: '',
      serviceAmount: '',
      serviceType: 'pre_engagement',
      description: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Create New Service</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        
        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError('')} className={styles.errorClose}>
              &times;
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="serviceName">Service Name *</label>
            <input
              type="text"
              id="serviceName"
              name="serviceName"
              value={formData.serviceName}
              onChange={handleChange}
              required
              placeholder="e.g., Marketing, Trademark Registration"
              className={styles.input}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="serviceAmount">Base Amount (₹) *</label>
              <input
                type="number"
                id="serviceAmount"
                name="serviceAmount"
                value={formData.serviceAmount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="Enter amount without GST"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="serviceType">Service Type</label>
              <select
                id="serviceType"
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="pre_engagement">Pre Engagement</option>
                <option value="post_engagement">Post Engagement</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of the service"
              className={styles.textarea}
            />
          </div>

          <div className={styles.calculationInfo}>
            <div className={styles.calculationRow}>
              <span>Base Amount:</span>
              <span>₹{formData.serviceAmount || '0.00'}</span>
            </div>
            <div className={styles.calculationRow}>
              <span>GST (18%):</span>
              <span>₹{formData.serviceAmount ? (parseFloat(formData.serviceAmount) * 0.18).toFixed(2) : '0.00'}</span>
            </div>
            <div className={`${styles.calculationRow} ${styles.total}`}>
              <span>Total Amount:</span>
              <span>₹{formData.serviceAmount ? (parseFloat(formData.serviceAmount) * 1.18).toFixed(2) : '0.00'}</span>
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={handleClose} 
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className={styles.submitButton}
            >
              {loading ? (
                <span className={styles.loadingText}>
                  <span className={styles.spinner} /> Creating...
                </span>
              ) : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}