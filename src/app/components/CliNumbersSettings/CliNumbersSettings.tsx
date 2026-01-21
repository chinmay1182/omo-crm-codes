'use client';

import React, { useState, useEffect } from 'react';
import styles from './CliNumbersSettings.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faPhone, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface CliNumber {
  id: string;
  number: string;
  display_name: string;
  is_default: boolean;
  type: 'voip' | 'whatsapp' | 'both';
  is_active: boolean;
  aparty?: string;
  auth_username?: string;
  auth_password?: string;
  created_at: string;
}

const CliNumbersSettings = () => {
  const [numbers, setNumbers] = useState<CliNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<CliNumber | null>(null);
  const [formData, setFormData] = useState({
    number: '',
    display_name: '',
    type: 'both' as 'voip' | 'whatsapp' | 'both',
    is_default: false,
    aparty: '',
    auth_username: '',
    auth_password: ''
  });

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cli-numbers');
      if (response.ok) {
        const data = await response.json();
        setNumbers(data);
      } else {
        toast.error('Failed to fetch CLI numbers');
      }
    } catch (error) {
      console.error('Error fetching CLI numbers:', error);
      toast.error('Failed to fetch CLI numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingNumber ? `/api/cli-numbers/${editingNumber.id}` : '/api/cli-numbers';
      const method = editingNumber ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingNumber ? 'CLI number updated successfully' : 'CLI number added successfully');
        fetchNumbers();
        handleCloseModal();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save CLI number');
      }
    } catch (error) {
      console.error('Error saving CLI number:', error);
      toast.error('Failed to save CLI number');
    }
  };

  const handleEdit = (number: CliNumber) => {
    setEditingNumber(number);
    setFormData({
      number: number.number,
      display_name: number.display_name,
      type: number.type,
      is_default: number.is_default,
      aparty: number.aparty || '',
      auth_username: number.auth_username || '',
      auth_password: number.auth_password || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (numberId: string) => {
    if (!confirm('Are you sure you want to delete this CLI number?')) return;

    try {
      const response = await fetch(`/api/cli-numbers/${numberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNumbers(numbers.filter(n => n.id !== numberId));
        toast.success('CLI number deleted successfully');
      } else {
        toast.error('Failed to delete CLI number');
      }
    } catch (error) {
      console.error('Error deleting CLI number:', error);
      toast.error('Failed to delete CLI number');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNumber(null);
    setFormData({
      number: '',
      display_name: '',
      type: 'both',
      is_default: false,
      aparty: '',
      auth_username: '',
      auth_password: ''
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading CLI numbers...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h3>CLI Numbers Management</h3>
        <button
          onClick={() => setShowModal(true)}
          className={styles.addButton}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add CLI Number
        </button>
      </div>

      <div className={styles.numbersList}>
        {numbers.length > 0 ? (
          numbers.map(number => (
            <div key={number.id} className={styles.numberItem}>
              <div className={styles.numberInfo}>
                <div className={styles.numberDetails}>
                  <h4>{number.display_name}</h4>
                  <p className={styles.phoneNumber}>
                    <FontAwesomeIcon icon={faPhone} />
                    {number.number}
                  </p>
                  {number.aparty && (
                    <p className={styles.apartyNumber}>A Party: {number.aparty}</p>
                  )}
                  <p className={styles.numberType}>Type: {number.type}</p>
                </div>
                <div className={styles.badges}>
                  {number.is_default && (
                    <span className={styles.defaultBadge}>Default</span>
                  )}
                  <span className={`${styles.typeBadge} ${styles[number.type]}`}>
                    {number.type}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  onClick={() => handleEdit(number)}
                  className={styles.editButton}
                  title="Edit number"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button
                  onClick={() => handleDelete(number.id)}
                  className={styles.deleteButton}
                  title="Delete number"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>No CLI numbers configured</p>
            <button
              onClick={() => setShowModal(true)}
              className={styles.addButton}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Your First CLI Number
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingNumber ? 'Edit CLI Number' : 'Add CLI Number'}</h3>
              <button onClick={handleCloseModal} className={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  required
                  placeholder="e.g., Main Office Line"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                  required
                  placeholder="e.g., +1234567890"
                />
              </div>

              <div className={styles.formGroup}>
                <label>A Party Number (for VoIP calls)</label>
                <input
                  type="text"
                  value={formData.aparty}
                  onChange={(e) => setFormData({...formData, aparty: e.target.value})}
                  placeholder="e.g., 8874700008 (optional)"
                />
                <small>The actual number used in call payload. Leave empty to use CLI number.</small>
              </div>

              <div className={styles.formGroup}>
                <label>VoIP Username (for authentication)</label>
                <input
                  type="text"
                  value={formData.auth_username}
                  onChange={(e) => setFormData({...formData, auth_username: e.target.value})}
                  placeholder="e.g., Consolegal@123"
                />
                <small>Username for VoIP service authentication</small>
              </div>

              <div className={styles.formGroup}>
                <label>VoIP Password (for authentication)</label>
                <input
                  type="password"
                  value={formData.auth_password}
                  onChange={(e) => setFormData({...formData, auth_password: e.target.value})}
                  placeholder="e.g., Consolegal@123"
                />
                <small>Password for VoIP service authentication</small>
              </div>

              <div className={styles.formGroup}>
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'voip' | 'whatsapp' | 'both'})}
                >
                  <option value="both">Both VoIP & WhatsApp</option>
                  <option value="voip">VoIP Only</option>
                  <option value="whatsapp">WhatsApp Only</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                  />
                  Set as default number
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={handleCloseModal} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton}>
                  {editingNumber ? 'Update' : 'Add'} CLI Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CliNumbersSettings;