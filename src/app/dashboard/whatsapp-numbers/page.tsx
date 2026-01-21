'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faPhone, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import WhatsAppNumberModal from '@/app/components/WhatsAppNumberModal/WhatsAppNumberModal';

interface WhatsAppNumber {
  id: string;
  number: string;
  display_name: string;
  is_active: boolean;
  is_default: boolean;
  api_key: string | null;
  webhook_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

const WhatsAppNumbersPage = () => {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp-numbers');
      if (response.ok) {
        const data = await response.json();
        setNumbers(data);
      } else {
        toast.error('Failed to fetch WhatsApp numbers');
      }
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
      toast.error('Failed to fetch WhatsApp numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberCreated = () => {
    fetchNumbers();
    setShowModal(false);
    setEditingNumber(null);
  };

  const handleEditNumber = (number: WhatsAppNumber) => {
    setEditingNumber(number);
    setShowModal(true);
  };

  const handleDeleteNumber = async (numberId: string) => {
    if (!confirm('Are you sure you want to delete this WhatsApp number?')) return;

    try {
      const response = await fetch(`/api/whatsapp-numbers/${numberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNumbers(numbers.filter(n => n.id !== numberId));
        toast.success('WhatsApp number deleted successfully');
      } else {
        toast.error('Failed to delete WhatsApp number');
      }
    } catch (error) {
      console.error('Error deleting WhatsApp number:', error);
      toast.error('Failed to delete WhatsApp number');
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

      const response = await fetch(`/api/whatsapp-numbers/${numberId}`, {
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
        toast.success('Default WhatsApp number updated');
      } else {
        toast.error('Failed to update default number');
      }
    } catch (error) {
      console.error('Error updating default number:', error);
      toast.error('Failed to update default number');
    }
  };

  const filteredNumbers = numbers.filter(number =>
    number.number.includes(searchQuery) ||
    number.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading WhatsApp numbers...</p>
      </div>
    );
  }

  return (
    <div className={styles.numbersContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>WhatsApp Numbers Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className={styles.addButton}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add WhatsApp Number
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.numbersGrid}>
        {filteredNumbers.length > 0 ? (
          filteredNumbers.map(number => (
            <div key={number.id} className={styles.numberCard}>
              <div className={styles.cardHeader}>
                <div className={styles.numberInfo}>
                  <h3 className={styles.displayName}>{number.display_name}</h3>
                  <p className={styles.phoneNumber}>
                    <FontAwesomeIcon icon={faPhone} />
                    {number.number}
                  </p>
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

              <div className={styles.cardContent}>
                <div className={styles.configInfo}>
                  <p><strong>API Key:</strong> {number.api_key ? '••••••••' : 'Not set'}</p>
                  <p><strong>Webhook:</strong> {number.webhook_url ? 'Configured' : 'Not set'}</p>
                  <p><strong>Status:</strong> 
                    <span className={number.is_active ? styles.activeText : styles.inactiveText}>
                      {number.is_active ? ' Active' : ' Inactive'}
                    </span>
                  </p>
                </div>
              </div>

              <div className={styles.cardActions}>
                {!number.is_default && (
                  <button
                    onClick={() => handleToggleDefault(number.id, number.is_default)}
                    className={styles.defaultButton}
                    title="Set as default"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    Set Default
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
          <div className={styles.noResults}>
            <p>No WhatsApp numbers found</p>
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
        <WhatsAppNumberModal
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

export default WhatsAppNumbersPage;