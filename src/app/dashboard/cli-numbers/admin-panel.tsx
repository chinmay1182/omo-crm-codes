'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faDatabase, faCheck } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import styles from './styles.module.css';

const AdminPanel = () => {
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [isEnsureLoading, setIsEnsureLoading] = useState(false);

  const setupCliTable = async () => {
    setIsSetupLoading(true);
    try {
      const response = await fetch('/api/setup-cli-numbers-table', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to setup CLI numbers table');
      }
    } catch (error) {
      console.error('Error setting up CLI table:', error);
      toast.error('Failed to setup CLI numbers table');
    } finally {
      setIsSetupLoading(false);
    }
  };

  const ensurePrimaryCli = async () => {
    setIsEnsureLoading(true);
    try {
      const response = await fetch('/api/ensure-main-cli', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to ensure primary CLI');
      }
    } catch (error) {
      console.error('Error ensuring primary CLI:', error);
      toast.error('Failed to ensure primary CLI');
    } finally {
      setIsEnsureLoading(false);
    }
  };

  return (
    <div className={styles.adminPanel}>
      <div className={styles.adminHeader}>
        <h3>🔧 Admin Panel</h3>
        <p>Quick setup and management tools for CLI numbers</p>
      </div>

      <div className={styles.adminActions}>
        <div className={styles.actionCard}>
          <div className={styles.actionIcon}>
            <FontAwesomeIcon icon={faDatabase} />
          </div>
          <div className={styles.actionContent}>
            <h4>Setup CLI Numbers Table</h4>
            <p>Initialize the database table with your CLI numbers (8881116071, 8810878185)</p>
            <button
              onClick={setupCliTable}
              disabled={isSetupLoading}
              className={styles.setupButton}
            >
              {isSetupLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Setting up...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faDatabase} />
                  Setup Table
                </>
              )}
            </button>
          </div>
        </div>

        <div className={styles.actionCard}>
          <div className={styles.actionIcon}>
            <FontAwesomeIcon icon={faCheck} />
          </div>
          <div className={styles.actionContent}>
            <h4>Ensure Primary CLI</h4>
            <p>Make sure the primary CLI number (8881116071) exists and is configured</p>
            <button
              onClick={ensurePrimaryCli}
              disabled={isEnsureLoading}
              className={styles.ensureButton}
            >
              {isEnsureLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Checking...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} />
                  Ensure Primary CLI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.cliInfo}>
        <h4>📞 Your CLI Numbers</h4>
        <div className={styles.cliList}>
          <div className={styles.cliItem}>
            <span className={styles.cliNumber}>8881116071</span>
            <span className={styles.cliLabel}>Primary CLI (Default)</span>
            <span className={styles.cliType}>VoIP + WhatsApp</span>
          </div>
          <div className={styles.cliItem}>
            <span className={styles.cliNumber}>8810878185</span>
            <span className={styles.cliLabel}>Secondary CLI</span>
            <span className={styles.cliType}>VoIP + WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;