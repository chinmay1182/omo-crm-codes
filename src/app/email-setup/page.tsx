'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast, Toaster } from 'react-hot-toast';
import styles from './email-setup.module.css';
import Gatekeeper from '../components/Auth/Gatekeeper';

type EmailConfig = {
    id: string;
    email: string;
    app_password: string;
    assigned_agent_id: string;
    agent_name?: string;
};

type UserProfile = {
    id: string;
    email: string;
    full_name?: string;
    type: 'Admin' | 'Agent';
};

export default function EmailSetupPage() {
    const [configs, setConfigs] = useState<EmailConfig[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [newConfig, setNewConfig] = useState({
        email: '',
        app_password: '',
        assigned_agent_id: ''
    });

    const supabase = createBrowserClient(
        'https://tztohhabbvoftwaxgues.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4'
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch existing configs using secure API
            let configData = [];
            try {
                const configRes = await fetch('/api/admin/email-setup/list');
                const configJson = await configRes.json();

                if (!configRes.ok) {
                    console.error('API Error:', configJson);
                    throw new Error(configJson.error || 'API failed');
                }

                if (configJson.configs) {
                    configData = configJson.configs;
                }
            } catch (err) {
                console.error('Config fetch error details:', err);
            }

            // 1. Get Current User (The Admin/User actively logged in)
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            let allUsers: UserProfile[] = [];

            // 2. Try Fetching All Admins from Secure API
            try {
                const profilesRes = await fetch('/api/admin/list-users');
                if (profilesRes.ok) {
                    const profilesData = await profilesRes.json();
                    const admins = (profilesData.users || []).map((p: any) => ({
                        id: p.id,
                        email: p.email,
                        full_name: p.full_name,
                        type: 'Admin' as const
                    }));
                    allUsers = [...allUsers, ...admins];
                }
            } catch (e) { console.warn('Admin fetch error', e); }

            // 3. Fetch from 'profiles' (Fallback, though likely to fail if RLS is strict)
            // We'll skip the directSupabase call if we have API data, or keep it as backup if needed.
            // For now, let's keep the user logic simple.

            // 4. Fetch Agents
            try {
                const agentsRes = await fetch('/api/admin/list-agents');
                if (agentsRes.ok) {
                    const agentsData = await agentsRes.json();
                    if (agentsData.agents) {
                        const agents = agentsData.agents.map((agent: any) => ({
                            id: String(agent.id),
                            email: agent.email,
                            full_name: agent.full_name || agent.username,
                            type: 'Agent' as const
                        }));
                        allUsers = [...allUsers, ...agents];
                    }
                }
            } catch (e) { console.warn('Agent fetch error', e); }

            // 5. Ensure Current User is in the list
            if (currentUser) {
                const exists = allUsers.find(u => u.id === currentUser.id);
                if (!exists) {
                    allUsers.unshift({
                        id: currentUser.id,
                        email: currentUser.email || 'Current User',
                        full_name: 'Me (Current User)',
                        type: 'Admin' as const
                    });
                }
            }

            // Deduplicate
            const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());
            setUsers(uniqueUsers as UserProfile[]);

            setConfigs(configData);

        } catch (error: any) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newConfig.email || !newConfig.app_password || !newConfig.assigned_agent_id) {
            toast.error('Please fill all fields');
            return;
        }

        try {
            const agentName = users.find(u => u.id === newConfig.assigned_agent_id)?.full_name || 'Agent';

            // Use API to bypass RLS
            const response = await fetch('/api/admin/email-setup/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newConfig.email,
                    app_password: newConfig.app_password,
                    assigned_agent_id: newConfig.assigned_agent_id,
                    agent_name: agentName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save');
            }

            toast.success('Configuration saved successfully');
            setNewConfig({ email: '', app_password: '', assigned_agent_id: '' });
            fetchData();
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error('Failed to save configuration: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            // Use API to bypass RLS
            const response = await fetch('/api/admin/email-setup/delete', {
                method: 'POST', // Using POST for delete action usually fine, or DELETE method if preferred
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete');
            }

            toast.success('Deleted successfully');
            fetchData();
        } catch (error: any) {
            toast.error('Delete failed: ' + error.message);
        }
    };

    return (
        <Gatekeeper>
            <div className={styles.container}>
                <Toaster />
                <div className={styles.setupBox}>
                    <div className={styles.header}>
                        <h1>Email Authority Setup</h1>
                        <p>Configure Gmail accounts and assign them to agents for centralized email management.</p>
                    </div>

                    {/* Add New Configuration */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Add New Configuration</h2>
                        <div className={styles.grid}>
                            <div className={styles.formGroup}>
                                <label>Gmail Address</label>
                                <input
                                    type="email"
                                    placeholder="agent@gmail.com"
                                    value={newConfig.email}
                                    onChange={e => setNewConfig({ ...newConfig, email: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>App Password (16 chars)</label>
                                <input
                                    type="text"
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    value={newConfig.app_password}
                                    onChange={e => setNewConfig({ ...newConfig, app_password: e.target.value })}
                                />
                                <div className={styles.helperText}>
                                    Generate at:{' '}
                                    <a href="https://myaccount.google.com/apppasswords" target="_blank" className={styles.link}>
                                        Google App Passwords
                                    </a>
                                </div>
                            </div>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label>Assign to Agent or Admin</label>
                                <select
                                    value={newConfig.assigned_agent_id}
                                    onChange={e => setNewConfig({ ...newConfig, assigned_agent_id: e.target.value })}
                                >
                                    <option value="">Select a User</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.type === 'Agent' ? '👤 CRM Agent' : '🛡️ Admin'} - {user.full_name || user.email}
                                        </option>
                                    ))}
                                </select>
                                {users.length === 0 && !loading && (
                                    <p className={styles.error} style={{ marginTop: '5px' }}>
                                        No users found.
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={handleSave} className={styles.submitBtn}>
                            <i className="fa-light fa-save"></i>
                            Save Configuration
                        </button>
                    </div>

                    {/* Existing Configurations */}
                    <div>
                        <h2 className={styles.sectionTitle}>Active Configurations</h2>
                        {loading ? (
                            <div className={styles.emptyState}>
                                <i className="fa-light fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                Loading...
                            </div>
                        ) : configs.length === 0 ? (
                            <div className={styles.emptyState}>
                                No active email configurations found.
                            </div>
                        ) : (
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Assigned Agent</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {configs.map(config => (
                                            <tr key={config.id}>
                                                <td>{config.email}</td>
                                                <td>
                                                    {users.find(u => u.id === config.assigned_agent_id)?.full_name || config.agent_name || config.assigned_agent_id}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleDelete(config.id)}
                                                        className={styles.deleteBtn}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Gatekeeper>
    );
}
