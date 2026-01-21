'use client';

import React, { useState, useEffect } from 'react';
import styles from './VoipNumbersSettings.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faPhone, faCheck } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import VoipNumberModal from '@/app/components/VoipNumberModal/VoipNumberModal';

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
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

const VoipNumbersSettings = () => {
  const [numbers, setNumbers] = useState<VoipNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<VoipNumber | null>(null);

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/voip-numbers');
      if (response.ok) {
        const data = await response.json();
        setNumbers(data);
      } else {
        toast.error('Failed to fetch VOIP numbers');
      }
    } catch (error) {
      console.error('Error fetching VOIP numbers:', error);
      toast.error('Failed to fetch VOIP numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberCreated = () => {
    fetchNumbers();
    setShowModal(false);
    setEditingNumber(null);
  };

  const handleEditNumber = (number: VoipNumber) => {
    setEditingNumber(number);
    setShowModal(true);
  };

  const handleDeleteNumber = async (numberId: string) => {
    if (!confirm('Are you sure you want to delete this VOIP number?')) return;

    try {
      const response = await fetch(`/api/voip-numbers/${numberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNumbers(numbers.filter(n => n.id !== numberId));
        toast.success('VOIP number deleted successfully');
      } else {
        toast.error('Failed to delete VOIP number');
      }
    } catch (error) {
      console.error('Error deleting VOIP number:', error);
      toast.error('Failed to delete VOIP number');
    }
  };

  const handleToggleDefault = async (numberId: string, currentDefault: boolean) => {
    if (currentDefault) {
      toast('This is already the default number');
      return;
    }

    try {
      const number = numbers.find(n => n.id === numberId);
      if (!number) return;

      const response = await fetch(`/api/voip-numbers/${numberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...number,
          is_default: true
        }),
      });

      if (response.ok) {
        fetchNumbers();
        toast.success('Default VOIP number updated');
      } else {
        toast.error('Failed to update default number');
      }
    } catch (error) {
      console.error('Error updating default number:', error);
      toast.error('Failed to update default number');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading VOIP numbers...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h3>VOIP Numbers</h3>
        <button
          onClick={() => setShowModal(true)}
          className={styles.addButton}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add Number
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
                    {number.cli_number}
                  </p>
                  <p className={styles.provider}>Provider: {number.provider}</p>
                </div>
                <div className={styles.badges}>
                  {number.is_default && (
                    <span className={styles.defaultBadge}>Default</span>
                  )}
                  <span className={`${styles.statusBadge} ${styles[number.status]}`}>
                    {number.status}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                {!number.is_default && (
                  <button
                    onClick={() => handleToggleDefault(number.id, number.is_default)}
                    className={styles.defaultButton}
                    title="Set as default"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                )}
                <button
                  onClick={() => handleEditNumber(number)}
                  className={styles.editButton}
                  title="Edit number"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button
                  onClick={() => handleDeleteNumber(number.id)}
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
            <p>No VOIP numbers configured</p>
            <button
              onClick={() => setShowModal(true)}
              className={styles.addButton}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Your First Number
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <VoipNumberModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingNumber(null);
          }}
          onSuccess={handleNumberCreated}
          number={editingNumber}
        />
      )}
    </div>
  );
};

export default VoipNumbersSettings;