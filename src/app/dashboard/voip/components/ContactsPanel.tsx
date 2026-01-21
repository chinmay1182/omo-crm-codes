'use client';

import React, { useState, useEffect } from 'react';
import { callAPI } from '@/app/lib/voipService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSave, faTimes, faPhone, faUser, faSearch } from '@fortawesome/free-solid-svg-icons';
import Spinner from '@/app/components/Spinner/Spinner';
import styles from '../styles.module.css';

interface AgentPermissions {
  canViewAllCalls: boolean;
  canViewAssignedCalls: boolean;
  canMakeCalls: boolean;
  canTransferCalls: boolean;
  canConferenceCalls: boolean;
}

interface ContactsPanelProps {
  token: string;
  cliNumber: string;
  agentPermissions?: AgentPermissions;
}

const ContactsPanel: React.FC<ContactsPanelProps> = ({ token, cliNumber, agentPermissions }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContacts();
  }, [token]);

  useEffect(() => {
    // Filter contacts based on search term
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => {
        const fullName = `${contact.title || ''} ${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
        const phone = (contact.phone || contact.mobile || '').toLowerCase();
        const company = (contact.company_name || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return fullName.includes(search) || 
               phone.includes(search) || 
               company.includes(search);
      });
      setFilteredContacts(filtered);
    }
  }, [contacts, searchTerm]);

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setContacts(data);
    } catch (err) {
      setError('Failed to load contacts');
    }
    setLoading(false);
  };

  const initiateCall = async (contactNumber: string) => {
    if (!token) return alert('Not authenticated');
    
    // Check if agent has permission to make calls
    if (agentPermissions && !agentPermissions.canMakeCalls) {
      alert('You do not have permission to make calls');
      return;
    }
    
    try {
      await callAPI(token, 'initiate-call', {
        cli: cliNumber,
        apartyno: cliNumber,
        bpartyno: contactNumber,
        reference_id: `contact_${Date.now()}`,
        channelflag: 0,
        dtmfflag: 0,
        recordingflag: 0
      });
      // You might want to add a success notification here
    } catch (error) {
      alert(`Call to ${contactNumber} failed`);
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.contactsHeader}>
        <h2 className={styles.cpaasHeading}>Contacts</h2>
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, phone, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Spinner size="medium" text="Loading contacts..." />
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <i className="fa-light fa-times-circle" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f44336' }}></i>
          <p>{error}</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fa-light fa-users" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ccc' }}></i>
          <p>{searchTerm ? 'No contacts found matching your search' : 'No contacts available'}</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={styles.clearSearchButton}>
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className={styles.contactsListContainer}>
          <div className={styles.contactsCount}>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
          </div>
          <ul className={styles.contactsList}>
            {filteredContacts.map((contact) => (
              <li key={contact.id} className={styles.contactItem}>
                <div className={styles.contactAvatar}>
                  <FontAwesomeIcon icon={faUser} className={styles.avatarIcon} />
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>
                    {contact.title} {contact.first_name} {contact.last_name}
                  </div>
                  <div className={styles.contactNumber}>
                    {contact.phone || contact.mobile || 'No phone'}
                  </div>
                  {contact.company_name && (
                    <div className={styles.contactCompany}>{contact.company_name}</div>
                  )}
                </div>
                {agentPermissions?.canMakeCalls !== false && (
                  <button
                    className={styles.callButton}
                    onClick={() => initiateCall(contact.phone || contact.mobile)}
                    title={`Call ${contact.first_name} ${contact.last_name}`}
                    disabled={!contact.phone && !contact.mobile}
                  >
                    <FontAwesomeIcon icon={faPhone} className={styles.callIcon} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ContactsPanel;