'use client';

import React from 'react';
import CliNumbersSettings from '@/app/components/CliNumbersSettings/CliNumbersSettings';
import AdminPanel from './admin-panel';
import styles from './styles.module.css';

export default function CliNumbersPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1>CLI Numbers Management</h1>
        <p>Manage phone numbers for VoIP calls and WhatsApp messaging</p>
      </div>
      
      <AdminPanel />
      
      <div className={styles.content}>
        <CliNumbersSettings />
      </div>
    </div>
  );
}