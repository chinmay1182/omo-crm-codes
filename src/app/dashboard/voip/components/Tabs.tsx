'use client';

import React, { useState } from 'react';
import ContactsPanel from './ContactsPanel';
import HistoryPanel from './HistoryPanel';
import VoipControls from './VoipControls';
import AudioManager from './AudioManager';
import CallsPanel from './CallsPanel'; // 👈 New component for Incoming & Missed Calls
import styles from '../styles.module.css';

interface AgentPermissions {
  canViewAllCalls: boolean;
  canViewAssignedCalls: boolean;
  canMakeCalls: boolean;
  canTransferCalls: boolean;
  canConferenceCalls: boolean;
}

interface TabsProps {
  token: string;
  selectedCliNumber: string;
  agentPermissions?: AgentPermissions;
  agentData?: {
    id: number;
    username: string;
    full_name?: string;
  };
}

const Tabs: React.FC<TabsProps> = ({ token, selectedCliNumber, agentPermissions, agentData }) => {
  const [activeTab, setActiveTab] = useState('controls');

  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabButton} ${activeTab === 'controls' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          Controls
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'contacts' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Call History
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'calls' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          Incoming & Missed
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'audio' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio Manager
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'controls' && (
          <VoipControls 
            token={token} 
            cliNumber={selectedCliNumber}
            agentPermissions={agentPermissions}
            agentData={agentData}
          />
        )}
        {activeTab === 'contacts' && (
          <ContactsPanel 
            token={token} 
            cliNumber={selectedCliNumber}
            agentPermissions={agentPermissions}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPanel 
            agentPermissions={agentPermissions}
            agentData={agentData}
          />
        )}
        {activeTab === 'calls' && (
          <CallsPanel 
            token={token} 
            cliNumber={selectedCliNumber}
            agentPermissions={agentPermissions}
            agentData={agentData}
          />
        )}
        {activeTab === 'audio' && (
          <AudioManager 
            token={token} 
            cliNumber={selectedCliNumber}
            agentPermissions={agentPermissions}
          />
        )}
      </div>
    </div>
  );
};

export default Tabs;
