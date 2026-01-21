'use client';

import { useState } from 'react';
import styles from './locationmodal.module.css';

interface LocationModalProps {
  companyId?: string;
  contactId?: string;
  onSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function LocationModal({ companyId, contactId, onSuccess, onClose, isOpen }: LocationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India'); // Default to India
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const countries = [
    "India", "United States", "United Kingdom", "United Arab Emirates", "Canada", "Australia", "Singapore"
  ];

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !city.trim() || !country.trim()) {
      setError('Name, address, city and country are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let url = '';
      let bodyData = {};

      if (companyId) {
        url = '/api/companies/locations';
        bodyData = {
          companyId,
          name,
          address,
          city,
          state: state || null,
          country,
          postal_code: postalCode || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        };
      } else if (contactId) {
        url = '/api/contacts/locations';
        bodyData = {
          contactId,
          name,
          address,
          city,
          state: state || null,
          country,
          postal_code: postalCode || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        };
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
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setCountry('India');
    setPostalCode('');
    setLatitude('');
    setLongitude('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h4>Add New Location</h4>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.locationForm}>
            <div className={styles.formGroup}>
              <label>Name*</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Address*</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>City*</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={styles.inputField}
                />
              </div>
              <div className={styles.formGroup}>
                <label>State</label>
                {country === 'India' ? (
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={styles.inputField}
                  >
                    <option value="">Select State</option>
                    {indianStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={styles.inputField}
                    placeholder="Enter State"
                  />
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Country*</label>
                <select
                  value={countries.includes(country) ? country : 'Other'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setCountry('');
                    } else {
                      setCountry(val);
                      if (val === 'India') {
                        setState(''); // Reset state if switching back to India to force selection logic
                      }
                    }
                  }}
                  className={styles.inputField}
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {!countries.includes(country) && (
                  <input
                    type="text"
                    placeholder="Enter Country Name"
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      if (e.target.value === 'India') setState('');
                    }}
                    className={styles.inputField}
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={styles.inputField}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className={styles.inputField}
                  placeholder="e.g., 40.7128"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className={styles.inputField}
                  placeholder="e.g., -74.0060"
                />
              </div>
            </div>

            {error && <p className={styles.errorText}>{error}</p>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !address.trim() || !city.trim() || !country.trim()}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      </div>
    </div>
  );
}