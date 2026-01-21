'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faPhone, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
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

const VoipNumbersPage = () => {
  const [numbers, setNumbers] = useState<VoipNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<VoipNumber | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');

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

  const filteredNumbers = numbers.filter(number => {
    const matchesSearch = number.cli_number.includes(searchQuery) ||
      number.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      number.provider.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProvider = filterProvider === 'all' || number.provider === filterProvider;
    
    return matchesSearch && matchesProvider;
  });

  const uniqueProviders = [...new Set(numbers.map(n => n.provider))];

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading VOIP numbers...</p>
      </div>
    );
  }

  return (
    <div className={styles.numbersContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>VOIP Numbers Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className={styles.addButton}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add VOIP Number
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
        
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Providers</option>
          {uniqueProviders.map(provider => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
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

              <div className={styles.cardContent}>
                <div className={styles.configInfo}>
                  <p><strong>API Endpoint:</strong> {number.api_endpoint ? 'Configured' : 'Not set'}</p>
                  <p><strong>API Key:</strong> {number.api_key ? '••••••••' : 'Not set'}</p>
                  <p><strong>API Secret:</strong> {number.api_secret ? '••••••••' : 'Not set'}</p>
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
            <p>No VOIP numbers found</p>
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

export default VoipNumbersPage;