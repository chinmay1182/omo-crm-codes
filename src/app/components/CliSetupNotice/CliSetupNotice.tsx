'use client';

import React, { useState } from 'react';
import styles from './CliSetupNotice.module.css';

interface CliSetupNoticeProps {
  show: boolean;
  onSetup?: () => void;
}

const CliSetupNotice: React.FC<CliSetupNoticeProps> = ({ show, onSetup }) => {
  const [isSettingUp, setIsSettingUp] = useState(false);

  if (!show) return null;

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('/api/setup-cli-numbers-table', {
        method: 'POST'
      });
      if (response.ok) {
        if (onSetup) onSetup();
        // Refresh the page to load the new numbers
        window.location.reload();
      }
    } catch (error) {
      console.error('Error setting up CLI numbers:', error);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className={styles.notice}>
      <div className={styles.content}>
        <h4>📞 CLI Numbers Setup Required</h4>
        <p>No CLI numbers are configured yet. Set up the CLI numbers system to start using phone numbers for calls and messaging.</p>
        <div className={styles.actions}>
          <button 
            onClick={handleSetup}
            disabled={isSettingUp}
            className={styles.setupButton}
          >
            {isSettingUp ? 'Setting up...' : 'Setup CLI Numbers'}
          </button>
          <a href="/test-cli" className={styles.testLink}>
            Go to Test Page
          </a>
        </div>
      </div>
    </div>
  );
};

export default CliSetupNotice;