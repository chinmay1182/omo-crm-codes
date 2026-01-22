'use client';

import { useState } from 'react';
import styles from './ContactCompanyModal.module.css';

interface Contact {
  id: string;
  title?: string;
  first_name: string;
  last_name: string;
  email?: string;
  company_id?: string;
  phone?: string;
  mobile?: string;
  description?: string;
  date_of_birth?: string;
  date_of_anniversary?: string;
  created_at?: string;
  updated_at?: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
  type?: string;
  registration_number?: string;
  incorporation_date?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface ContactCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'contact' | 'company';
  data: Contact | Company;
}

export default function ContactCompanyModal({ isOpen, onClose, type, data }: ContactCompanyModalProps) {
  if (!isOpen) return null;

  const handleEmail = () => {
    const email = type === 'contact' ? (data as Contact).email : (data as Company).email;
    if (email) {
      window.open(`mailto:${email}`, '_blank');
    }
  };

  const handleWhatsApp = () => {
    const phone = type === 'contact'
      ? (data as Contact).mobile || (data as Contact).phone
      : (data as Company).phone;
    if (phone) {
      // Remove any non-digit characters and format for WhatsApp
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleCall = () => {
    const phone = type === 'contact'
      ? (data as Contact).phone || (data as Contact).mobile
      : (data as Company).phone;
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{type === 'contact' ? 'Contact Details' : 'Company Details'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fa-light fa-times"></i>
          </button>
        </div>

        <div className={styles.content}>
          {type === 'contact' ? (
            <div className={styles.contactDetails}>
              <div className={styles.detailRow}>
                <strong>Name:</strong>
                <span>{(data as Contact).title} {(data as Contact).first_name} {(data as Contact).last_name}</span>
              </div>
              {(data as Contact).email && (
                <div className={styles.detailRow}>
                  <strong>Email:</strong>
                  <span>{(data as Contact).email}</span>
                </div>
              )}
              {(data as Contact).phone && (
                <div className={styles.detailRow}>
                  <strong>Phone:</strong>
                  <span>{(data as Contact).phone}</span>
                </div>
              )}
              {(data as Contact).mobile && (
                <div className={styles.detailRow}>
                  <strong>Mobile:</strong>
                  <span>{(data as Contact).mobile}</span>
                </div>
              )}
              {(data as Contact).company_name && (
                <div className={styles.detailRow}>
                  <strong>Company:</strong>
                  <span>{(data as Contact).company_name}</span>
                </div>
              )}
              {(data as Contact).date_of_birth && (
                <div className={styles.detailRow}>
                  <strong>Date of Birth:</strong>
                  <span>{new Date((data as Contact).date_of_birth!).toLocaleDateString()}</span>
                </div>
              )}
              {(data as Contact).date_of_anniversary && (
                <div className={styles.detailRow}>
                  <strong>Anniversary:</strong>
                  <span>{new Date((data as Contact).date_of_anniversary!).toLocaleDateString()}</span>
                </div>
              )}
              {(data as Contact).description && (
                <div className={styles.detailRow}>
                  <strong>Description:</strong>
                  <span>{(data as Contact).description}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.companyDetails}>
              <div className={styles.detailRow}>
                <strong>Name:</strong>
                <span>{(data as Company).name}</span>
              </div>
              {(data as Company).type && (
                <div className={styles.detailRow}>
                  <strong>Type:</strong>
                  <span>{(data as Company).type}</span>
                </div>
              )}
              {(data as Company).email && (
                <div className={styles.detailRow}>
                  <strong>Email:</strong>
                  <span>{(data as Company).email}</span>
                </div>
              )}
              {(data as Company).phone && (
                <div className={styles.detailRow}>
                  <strong>Phone:</strong>
                  <span>{(data as Company).phone}</span>
                </div>
              )}
              {(data as Company).website && (
                <div className={styles.detailRow}>
                  <strong>Website:</strong>
                  <span>
                    <a href={(data as Company).website} target="_blank" rel="noopener noreferrer">
                      {(data as Company).website}
                    </a>
                  </span>
                </div>
              )}
              {(data as Company).registration_number && (
                <div className={styles.detailRow}>
                  <strong>Registration #:</strong>
                  <span>{(data as Company).registration_number}</span>
                </div>
              )}
              {(data as Company).description && (
                <div className={styles.detailRow}>
                  <strong>Description:</strong>
                  <span>{(data as Company).description}</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}