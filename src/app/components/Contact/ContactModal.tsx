'use client';

import { useState, useEffect } from 'react';
import styles from './styles.module.css';

type Contact = {
  id?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_id?: string;
  company_name?: string;
  phone?: string;
  mobile?: string;
  description?: string;
  date_of_birth?: string;
  date_of_anniversary?: string;
};

type ContactModalProps = {
  userId?: string;
  contact?: Contact;
  onClose: () => void;
  onSuccess: (id?: string, name?: string) => void;
  companyId?: string;
  companyName?: string;
  isOpen: boolean;
};

type CompanyOption = {
  id: string;
  name: string;
};

export default function ContactModal({
  contact,
  onClose,
  onSuccess,
  companyId,
  companyName,
  isOpen
}: ContactModalProps) {
  // Debug logging

  const [formData, setFormData] = useState<Contact>({
    title: '',
    first_name: '',
    last_name: '',
    email: '',
    company_id: companyId || '',
    company_name: companyName || '',
    phone: '',
    mobile: '',
    description: '',
    date_of_birth: '',
    date_of_anniversary: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // New state for company selection
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companySelectionMode, setCompanySelectionMode] = useState<'existing' | 'new' | 'none'>('none');
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        title: contact.title || '',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        company_id: contact.company_id || companyId || '',
        company_name: contact.company_name || companyName || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        description: contact.description || '',
        date_of_birth: contact.date_of_birth || '',
        date_of_anniversary: contact.date_of_anniversary || ''
      });

      // Determine initial mode based on contact data
      if (contact.company_id) {
        setCompanySelectionMode('existing');
      } else if (contact.company_name && !contact.company_id) {
        setCompanySelectionMode('new');
      } else {
        setCompanySelectionMode('none');
      }
    } else if (companyId || companyName) {
      setFormData(prev => ({
        ...prev,
        company_id: companyId || '',
        company_name: companyName || ''
      }));
      setCompanySelectionMode('existing');
    } else {
      // Default for new contact (no props)
      setCompanySelectionMode('none');
    }
  }, [contact, companyId, companyName]);

  // Fetch companies list for dropdown
  useEffect(() => {
    // Fetch companies if:
    // 1. Not in forced company context (no companyId/companyName props)
    // 2. OR editing a contact that has a company (need to show it in dropdown)
    if (!companyId && !companyName) {
      const fetchCompanies = async () => {
        setLoadingCompanies(true);
        try {
          const res = await fetch('/api/companies');
          if (res.ok) {
            const data = await res.json();
            setCompanies(data);
          }
        } catch (e) {
          console.error("Failed to fetch companies", e);
        } finally {
          setLoadingCompanies(false);
        }
      };
      fetchCompanies();
    }
  }, [companyId, companyName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleModeChange = (mode: 'existing' | 'new' | 'none') => {
    setCompanySelectionMode(mode);
    // Clear relevant fields when switching modes logic can be handled here or at submit
    // However, for UI consistency, let's clear them from state too so input reflects it
    setFormData(prev => ({
      ...prev,
      // If switching to existing, clear custom name. If switching to new, clear ID.
      // If switching to none, clear both.
      company_id: mode === 'existing' ? prev.company_id : '',
      company_name: mode === 'new' ? prev.company_name : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.first_name || !formData.last_name) {
      setError('First name and last name are required');
      setIsSubmitting(false);
      return;
    }

    // Validate company selection
    if (companySelectionMode === 'existing' && !companyId && !formData.company_id) {
      setError('Please select a company');
      setIsSubmitting(false);
      return;
    }
    if (companySelectionMode === 'new' && !companyId && !formData.company_name?.trim()) {
      setError('Please enter a company name');
      setIsSubmitting(false);
      return;
    }

    try {
      const url = contact?.id ? `/api/contacts/${contact.id}` : '/api/contacts';
      const method = contact?.id ? 'PUT' : 'POST';

      // Prepare payload based on mode
      let finalCompanyId: string | null | undefined = formData.company_id;
      let finalCompanyName: string | null | undefined = formData.company_name;

      if (!companyId) { // Only override if not in forced-context mode
        if (companySelectionMode === 'none') {
          finalCompanyId = null;
          finalCompanyName = null;
        } else if (companySelectionMode === 'existing') {
          finalCompanyName = null; // Ensure we don't send a name that triggers creation
          // finalCompanyId is already set from state
        } else if (companySelectionMode === 'new') {
          finalCompanyId = null; // Ensure ID is null so backend creates new
          // finalCompanyName is already set from state
        }
      }

      const bodyData = {
        ...formData,
        company_id: finalCompanyId,
        company_name: finalCompanyName,
        // Format dates to YYYY-MM-DD format for MySQL
        date_of_birth: formData.date_of_birth ?
          (formData.date_of_birth.includes('T') ? formData.date_of_birth.split('T')[0] : formData.date_of_birth) :
          null,
        date_of_anniversary: formData.date_of_anniversary ?
          (formData.date_of_anniversary.includes('T') ? formData.date_of_anniversary.split('T')[0] : formData.date_of_anniversary) :
          null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contact');
      }

      // Read the response body to ensure the request is fully processed
      const result = await response.json();


      // Add error handling for onSuccess callback
      try {
        if (typeof onSuccess === 'function') {
          onSuccess(result.id, `${result.first_name} ${result.last_name}`);
        } else {
          console.error('onSuccess is not a function:', typeof onSuccess, onSuccess);
          // Don't throw an error, just log it and continue
          console.warn('Skipping onSuccess callback due to invalid type');
        }
      } catch (callbackError) {
        console.error('Error in onSuccess callback:', callbackError);
        // Don't re-throw the error, just log it
        console.warn('Continuing despite onSuccess callback error');
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setError(err.message || 'Failed to save contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{contact?.id ? 'Edit Contact' : 'Add New Contact'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <select
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.select}
                >
                  <option value="">Select Title</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="First Name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Last Name"
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
                  placeholder="email@example.com"
                />
              </div>

              {/* Show company field when not in forced company context OR when editing */}
              {(!companyId && !companyName) && (
                <div className={`${styles.formGroup} ${styles.formGroupFull}`} style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '0' }}>
                  <label style={{ marginBottom: '12px', display: 'block', fontWeight: 'bold' }}>Company Association</label>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontWeight: '300', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="companyMode"
                        value="existing"
                        checked={companySelectionMode === 'existing'}
                        onChange={() => handleModeChange('existing')}
                        style={{ marginRight: '8px' }}
                      />
                      Select Existing
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', fontWeight: '300', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="companyMode"
                        value="new"
                        checked={companySelectionMode === 'new'}
                        onChange={() => handleModeChange('new')}
                        style={{ marginRight: '8px' }}
                      />
                      Create New
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', fontWeight: '300', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="companyMode"
                        value="none"
                        checked={companySelectionMode === 'none'}
                        onChange={() => handleModeChange('none')}
                        style={{ marginRight: '8px' }}
                      />
                      Not Applicable
                    </label>
                  </div>

                  {companySelectionMode === 'existing' && (
                    <select
                      name="company_id"
                      value={formData.company_id}
                      onChange={handleChange}
                      disabled={isSubmitting || loadingCompanies}
                      className={styles.select}
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {companySelectionMode === 'new' && (
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="Enter new company name"
                      className={styles.input}
                    />
                  )}

                  {companySelectionMode === 'none' && (
                    <div style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic', marginTop: '5px' }}>
                      This contact will not be linked to any company.
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Phone number"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Mobile</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                  placeholder="Mobile number"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Anniversary</label>
                <input
                  type="date"
                  name="date_of_anniversary"
                  value={formData.date_of_anniversary}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={styles.input}
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
                  placeholder="Add notes or description"
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
                {isSubmitting ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}