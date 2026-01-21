'use client';

import React, { useState, useEffect } from 'react';
import styles from './ServiceModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  service_code: string;
  unique_service_code: string;
  service_name: string;
  service_names: string[];
  service_categories: string[];
  service_type: 'pre_engagement' | 'post_engagement';
  service_tat: number | string; // TAT in days (can be number or string from API)
  service_fee: number;
  professional_fee: number;
  discount: number;
  challan_associated: string;
  gst_amount: number;
  total_amount: number;
}

interface ServiceTag {
  id: string;
  name: string;
  type: 'service_name' | 'service_category';
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service?: Service | null;
  serviceTags: ServiceTag[];
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  service,
  serviceTags
}) => {
  const [formData, setFormData] = useState({
    unique_service_code: '',
    service_name: '',
    service_type: 'pre_engagement' as 'pre_engagement' | 'post_engagement',
    service_tat: '',
    service_fee: '',
    professional_fee: '',
    discount: '0',
    challan_associated: ''
  });
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [selectedServiceCategories, setSelectedServiceCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setFormData({
        unique_service_code: service.unique_service_code,
        service_name: service.service_name,
        service_type: service.service_type,
        service_tat: service.service_tat.toString(), // TAT is now in days (number)
        service_fee: service.service_fee.toString(),
        professional_fee: service.professional_fee.toString(),
        discount: service.discount.toString(),
        challan_associated: service.challan_associated
      });
      setSelectedServiceNames(service.service_names || []);
      setSelectedServiceCategories(service.service_categories || []);
    } else {
      resetForm();
    }
  }, [service, isOpen]);

  const resetForm = () => {
    setFormData({
      unique_service_code: '',
      service_name: '',
      service_type: 'pre_engagement',
      service_tat: '',
      service_fee: '',
      professional_fee: '',
      discount: '0',
      challan_associated: ''
    });
    setSelectedServiceNames([]);
    setSelectedServiceCategories([]);
    setError('');
  };

  const calculateAmounts = () => {
    const serviceFee = parseFloat(formData.service_fee) || 0;
    const professionalFee = parseFloat(formData.professional_fee) || 0;
    const discount = parseFloat(formData.discount) || 0;

    const subtotal = serviceFee + professionalFee - discount;
    const gstAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + gstAmount;

    return {
      gstAmount: gstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unique_service_code.trim()) {
      setError('Unique Service Code is required');
      return;
    }

    if (!formData.service_name.trim()) {
      setError('Service Name is required');
      return;
    }

    if (!formData.service_tat || parseInt(formData.service_tat) < 1) {
      setError('Service TAT (in days) is required and must be at least 1');
      return;
    }

    if (!formData.service_fee || parseFloat(formData.service_fee) < 0) {
      setError('Valid Service Fee is required');
      return;
    }

    if (!formData.professional_fee || parseFloat(formData.professional_fee) < 0) {
      setError('Valid Professional Fee is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { gstAmount, totalAmount } = calculateAmounts();

      const payload = {
        ...formData,
        service_names: selectedServiceNames,
        service_categories: selectedServiceCategories,
        service_tat: parseInt(formData.service_tat), // Convert TAT to number (days)
        service_fee: parseFloat(formData.service_fee),
        professional_fee: parseFloat(formData.professional_fee),
        discount: parseFloat(formData.discount) || 0,
        gst_amount: parseFloat(gstAmount),
        total_amount: parseFloat(totalAmount)
      };

      const url = service ? `/api/services/${service.id}` : '/api/services';
      const method = service ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save service');
      }

      toast.success(service ? 'Service updated successfully' : 'Service created successfully');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceNameTags = serviceTags.filter(tag => tag.type === 'service_name');
  const serviceCategoryTags = serviceTags.filter(tag => tag.type === 'service_category');
  const { gstAmount, totalAmount } = calculateAmounts();

  const toggleServiceName = (tagName: string) => {
    setSelectedServiceNames(prev =>
      prev.includes(tagName)
        ? prev.filter(name => name !== tagName)
        : [...prev, tagName]
    );
  };

  const toggleServiceCategory = (tagName: string) => {
    setSelectedServiceCategories(prev =>
      prev.includes(tagName)
        ? prev.filter(cat => cat !== tagName)
        : [...prev, tagName]
    );
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{service ? 'Edit Service' : 'Add New Service'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Unique Service Code *</label>
              <input
                type="text"
                name="unique_service_code"
                value={formData.unique_service_code}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter unique service code"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Service Name *</label>
              <input
                type="text"
                name="service_name"
                value={formData.service_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter service name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Service Names (Tags)</label>
              <div className={styles.tagContainer}>
                {serviceNameTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleServiceName(tag.name)}
                    className={`${styles.tagButton} ${selectedServiceNames.includes(tag.name) ? styles.tagSelected : ''}`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              {selectedServiceNames.length > 0 && (
                <div className={styles.selectedTags}>
                  <small>Selected: {selectedServiceNames.join(', ')}</small>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Service Categories (Tags)</label>
              <div className={styles.tagContainer}>
                {serviceCategoryTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleServiceCategory(tag.name)}
                    className={`${styles.tagButton} ${selectedServiceCategories.includes(tag.name) ? styles.tagSelected : ''}`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              {selectedServiceCategories.length > 0 && (
                <div className={styles.selectedTags}>
                  <small>Selected: {selectedServiceCategories.join(', ')}</small>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Service Type *</label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleInputChange}
                className={styles.select}
                required
              >
                <option value="pre_engagement">Pre Engagement</option>
                <option value="post_engagement">Post Engagement</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Service TAT (Days) *</label>
              <input
                type="number"
                name="service_tat"
                value={formData.service_tat}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter TAT in days (e.g., 7, 15, 30)"
                min="1"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Service Fee (₹) *</label>
              <input
                type="number"
                name="service_fee"
                value={formData.service_fee}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Professional Fee (₹) *</label>
              <input
                type="number"
                name="professional_fee"
                value={formData.professional_fee}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Discount (₹)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Challan Associated</label>
              <input
                type="text"
                name="challan_associated"
                value={formData.challan_associated}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter challan number"
              />
            </div>
          </div>

          <div className={styles.calculationSection}>
            <h3 style={{ fontSize: '18px', fontWeight: '300' }}>Calculation Summary</h3>
            <div className={styles.calculationGrid}>
              <div className={styles.calculationItem}>
                <span>Service Fee:</span>
                <span>₹{parseFloat(formData.service_fee || '0').toFixed(2)}</span>
              </div>
              <div className={styles.calculationItem}>
                <span>Professional Fee:</span>
                <span>₹{parseFloat(formData.professional_fee || '0').toFixed(2)}</span>
              </div>
              <div className={styles.calculationItem}>
                <span>Discount:</span>
                <span>-₹{parseFloat(formData.discount || '0').toFixed(2)}</span>
              </div>
              <div className={styles.calculationItem}>
                <span>GST (18%):</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className={`${styles.calculationItem} ${styles.totalRow}`}>
                <span style={{ fontSize: '16px', fontWeight: '300' }}>Total Amount:</span>
                <span style={{ fontSize: '16px', fontWeight: '300' }}>₹{totalAmount}</span>
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (service ? 'Update Service' : 'Create Service')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceModal;