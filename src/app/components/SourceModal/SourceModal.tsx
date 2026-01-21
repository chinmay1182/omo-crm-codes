'use client';

import React, { useState } from 'react';
import styles from './SourceModal.module.css';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sourceName: string) => void;
}

export default function SourceModal({ isOpen, onClose, onSuccess }: SourceModalProps) {
  const [formData, setFormData] = useState({
    sourceName: '',
    description: '',
    category: 'digital'
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
      if (!formData.sourceName.trim()) {
        throw new Error('Source name is required');
      }

      // For now, we'll just store sources in localStorage
      // In a real app, you might want to create an API endpoint for sources
      const savedSources = localStorage.getItem('leadSources');
      const existingSources = savedSources ? JSON.parse(savedSources) : [];
      
      // Check if source already exists
      const sourceExists = existingSources.some((source: any) => 
        source.name.toLowerCase() === formData.sourceName.toLowerCase()
      );
      
      if (sourceExists) {
        throw new Error('A source with this name already exists');
      }

      const newSource = {
        id: Date.now().toString(),
        name: formData.sourceName,
        description: formData.description,
        category: formData.category,
        created_at: new Date().toISOString()
      };

      const updatedSources = [...existingSources, newSource];
      localStorage.setItem('leadSources', JSON.stringify(updatedSources));

      onSuccess(formData.sourceName);
      
      // Reset form
      setFormData({
        sourceName: '',
        description: '',
        category: 'digital'
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
      sourceName: '',
      description: '',
      category: 'digital'
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Create New Lead Source</h2>
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
            <label htmlFor="sourceName">Source Name *</label>
            <input
              type="text"
              id="sourceName"
              name="sourceName"
              value={formData.sourceName}
              onChange={handleChange}
              required
              placeholder="e.g., LinkedIn, Google Ads, Trade Show"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="digital">Digital Marketing</option>
              <option value="social">Social Media</option>
              <option value="referral">Referral</option>
              <option value="event">Events & Trade Shows</option>
              <option value="direct">Direct Contact</option>
              <option value="partnership">Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of this lead source"
              className={styles.textarea}
            />
          </div>

          <div className={styles.sourceExamples}>
            <h4>Popular Sources by Category:</h4>
            <div className={styles.exampleGrid}>
              <div className={styles.exampleCategory}>
                <strong>Digital:</strong> Google Ads, SEO, Email Campaign
              </div>
              <div className={styles.exampleCategory}>
                <strong>Social:</strong> LinkedIn, Facebook, Instagram
              </div>
              <div className={styles.exampleCategory}>
                <strong>Events:</strong> Trade Show, Conference, Webinar
              </div>
              <div className={styles.exampleCategory}>
                <strong>Direct:</strong> Cold Call, Walk-in, Website Form
              </div>
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
              ) : 'Create Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}