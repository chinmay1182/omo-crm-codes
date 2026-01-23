import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from './MeetingsApiSettingsModal.module.css';
import toast from 'react-hot-toast';

interface MeetingsApiSettingsModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    user: any;
}

export default function MeetingsApiSettingsModal({ isOpen, onRequestClose, user }: MeetingsApiSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'instructions' | 'api_settings'>('instructions');

    // API Keys State
    const [apiData, setApiData] = useState({
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        apiKey: ''
    });

    useEffect(() => {
        if (isOpen && user?.id) {
            // Fetch existing API Settings
            fetch(`/api/agent-meeting-apis?agentId=${user.id}`)
                .then(res => {
                    if (res.ok) return res.json();
                    return null;
                })
                .then(data => {
                    if (data) {
                        setApiData({
                            clientId: data.google_client_id || '',
                            clientSecret: data.google_client_secret || '',
                            redirectUri: data.google_redirect_uri || '',
                            apiKey: data.google_api_key || ''
                        });
                    }
                })
                .catch(err => console.error('Error fetching API settings:', err));
        }
    }, [isOpen, user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setApiData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const saveApiSettings = async () => {
        if (!user || !user.id) {
            toast.error('User not identified');
            return;
        }

        try {
            const res = await fetch('/api/agent-meeting-apis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: user.id,
                    ...apiData
                })
            });

            if (res.ok) {
                toast.success('API Settings updated successfully!');
                onRequestClose();
            } else {
                toast.error('Failed to update API settings');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error updating API settings');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className={styles.modal}
            overlayClassName={styles.modalOverlay}
            style={{
                overlay: {
                    zIndex: 99999
                }
            }}
        >
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Meetings API Settings</h3>
                <button
                    className={styles.closeButton}
                    onClick={onRequestClose}
                >
                    <i className="fa-light fa-xmark"></i>
                </button>
            </div>

            <div className={styles.tabsContainer}>
                <button
                    onClick={() => setActiveTab('instructions')}
                    className={`${styles.tabButton} ${activeTab === 'instructions' ? styles.activeTab : ''}`}
                >
                    Instructions
                </button>
                <button
                    onClick={() => setActiveTab('api_settings')}
                    className={`${styles.tabButton} ${activeTab === 'api_settings' ? styles.activeTab : ''}`}
                >
                    My API Settings
                </button>
            </div>

            <div className={styles.modalBody}>
                {activeTab === 'instructions' && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroupFull} style={{ lineHeight: '1.6', color: '#374151' }}>
                            <h4 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>How to Enable Google Meet Booking</h4>
                            <p>To enable automatic Google Meet link generation for your appointments, you need to configure your own Google Cloud Project. Follow these steps:</p>

                            <ol style={{ marginLeft: '20px', marginTop: '10px' }}>
                                <li style={{ marginBottom: '8px' }}>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Google Cloud Console</a>.</li>
                                <li style={{ marginBottom: '8px' }}>Create a new project or select an existing one.</li>
                                <li style={{ marginBottom: '8px' }}>Navigate to <strong>APIs & Services {'>'} Library</strong>.</li>
                                <li style={{ marginBottom: '8px' }}>Search for and enable the following APIs:
                                    <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                                        <li><strong>Google Calendar API</strong></li>
                                        <li><strong>Google Meet API</strong> (if available/required separately)</li>
                                    </ul>
                                </li>
                                <li style={{ marginBottom: '8px' }}>Go to <strong>APIs & Services {'>'} OAuth consent screen</strong> and configure it (External for general use).</li>
                                <li style={{ marginBottom: '8px' }}>Go to <strong>APIs & Services {'>'} Credentials</strong>.</li>
                                <li style={{ marginBottom: '8px' }}>Click <strong>Create Credentials</strong> and select <strong>OAuth client ID</strong>.</li>
                                <li style={{ marginBottom: '8px' }}>Choose <strong>Web application</strong>.</li>
                                <li style={{ marginBottom: '8px' }}>Add your authorized redirect URIs (e.g., <code>https://your-app.com/api/auth/callback/google</code>).</li>
                                <li style={{ marginBottom: '8px' }}>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.</li>
                            </ol>
                            <p style={{ marginTop: '10px' }}>Once obtained, go to the <strong>My API Settings</strong> tab and enter these credentials to link your account.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'api_settings' && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroupFull}>
                            <label>Google Client ID</label>
                            <input
                                type="text"
                                name="clientId"
                                value={apiData.clientId}
                                onChange={handleInputChange}
                                placeholder="Enter Google Client ID"
                            />
                        </div>
                        <div className={styles.formGroupFull}>
                            <label>Google Client Secret</label>
                            <input
                                type="password"
                                name="clientSecret"
                                value={apiData.clientSecret}
                                onChange={handleInputChange}
                                placeholder="Enter Google Client Secret"
                            />
                        </div>
                        <div className={styles.formGroupFull}>
                            <label>Google Redirect URI</label>
                            <input
                                type="text"
                                name="redirectUri"
                                value={apiData.redirectUri}
                                onChange={handleInputChange}
                                placeholder="Enter Authorized Redirect URI"
                            />
                        </div>
                        <div className={styles.formGroupFull}>
                            <label>Google API Key (Optional)</label>
                            <input
                                type="text"
                                name="apiKey"
                                value={apiData.apiKey}
                                onChange={handleInputChange}
                                placeholder="Enter Google API Key"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.modalActions}>
                <button
                    className={styles.cancelBtn}
                    onClick={onRequestClose}
                >
                    Cancel
                </button>
                {activeTab === 'api_settings' && (
                    <button
                        className={styles.saveBtn}
                        onClick={saveApiSettings}
                    >
                        Save Settings
                    </button>
                )}
            </div>
        </Modal>
    );
}
