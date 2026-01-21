'use client';

import { useState, useEffect } from 'react';
import styles from './styles.module.css';

type Company = {
  id?: string;
  name?: string;
  type?: string;
  registration_number?: string;
  incorporation_date?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
};

type CompanyModalProps = {
  company?: Company;
  onClose: () => void;
  onSuccess: (id?: string, name?: string) => void;
  isOpen: boolean;
};

export default function CompanyModal({
  company,
  onClose,
  onSuccess,
  isOpen
}: CompanyModalProps) {
  const [formData, setFormData] = useState<Company>({
    name: '',
    type: '',
    registration_number: '',
    incorporation_date: '',
    phone: '',
    email: '',
    website: '',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        type: company.type || '',
        registration_number: company.registration_number || '',
        incorporation_date: company.incorporation_date
          ? (company.incorporation_date.includes('T') ? company.incorporation_date.split('T')[0] : company.incorporation_date)
          : '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        description: company.description || ''
      });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.name) {
      setError('Company name is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const url = company?.id ? `/api/companies/${company.id}` : '/api/companies';
      const method = company?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save company');
      }

      const result = await response.json();
      onSuccess(result.id, result.name);
    } catch (err) {
      console.error('Error saving company:', err);
      setError('Failed to save company. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{company?.id ? 'Edit Company' : 'Add New Company'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Company Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Enter company name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Company Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.select}
                >
                  <option value="">Select Type</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="LLP">LLP</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>GSTIN Number</label>
                <input
                  type="text"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Enter GSTIN"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Incorporation Date</label>
                <input
                  type="date"
                  name="incorporation_date"
                  value={formData.incorporation_date}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Enter phone number"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Enter email address"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="https://example.com"
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  disabled={isSubmitting}
                  className={styles.textarea}
                  placeholder="Enter company description"
                />
              </div>

            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Company'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}