'use client';

import React, { useState, useEffect } from 'react';
import Spinner from '@/app/components/Spinner/Spinner';
import styles from './styles.module.css';
import { getPermissionDisplayName } from '@/app/lib/permissionUtils';
import { PERMISSION_OPTIONS, PERMISSION_LEVELS, AgentPermissions } from '@/app/lib/roleDefaults';

interface Agent {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
}

export default function AgentPermissionsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [permissions, setPermissions] = useState<AgentPermissions>({
    whatsapp: [],
    voip: [],
    admin: [],
    contacts: [],
    services: [],
    tasks: [],
    notes: [],
    tickets: [],
    leads: [],
    forms: [],
    scheduling: [],
    meetings: []
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cliNumbers, setCliNumbers] = useState<any[]>([]);

  /* ---------- Create Agent Logic ---------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    email: '',
    username: '',
    phone_number: '',
    assigned_cli_ids: [] as string[]
  });
  const [createdAgentCredentials, setCreatedAgentCredentials] = useState<any>(null);

  useEffect(() => {
    fetchAgents();
    fetchCliNumbers();
  }, []);

  const fetchCliNumbers = async () => {
    try {
      const response = await fetch('/api/cli-numbers');
      if (response.ok) {
        const data = await response.json();
        setCliNumbers(data || []);
      }
    } catch (error) {
      console.error('Error fetching CLI numbers:', error);
    }
  };

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
    setLoading(false);
  };

  const fetchAgentPermissions = async (agentId: number) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/admin/agent-permissions?agentId=${agentId}`);
      if (response.ok) {
        const data = await response.json();

        // Convert permissions array to object
        const permissionsObj: AgentPermissions = {
          whatsapp: [],
          voip: [],
          admin: [],
          contacts: [],
          services: [],
          tasks: [],
          notes: [],
          tickets: [],
          leads: [],
          forms: [],
          scheduling: [],
          meetings: []
        };

        if (data.permissions && Array.isArray(data.permissions)) {
          data.permissions.forEach((perm: any) => {
            if (permissionsObj[perm.service_type as keyof AgentPermissions]) {
              permissionsObj[perm.service_type as keyof AgentPermissions].push(perm.permission_type);
            }
          });
        }

        setPermissions(permissionsObj);
      } else {
        setPermissions(getDefaultPermissions());
      }
    } catch (error) {
      console.error('Error fetching agent permissions:', error);
      setPermissions(getDefaultPermissions());
    }
    setIsRefreshing(false);
  };

  const getDefaultPermissions = (): AgentPermissions => ({
    whatsapp: [],
    voip: [],
    admin: [],
    contacts: [],
    services: [],
    tasks: [],
    notes: [],
    tickets: [],
    leads: [],
    forms: [],
    scheduling: [],
    meetings: []
  });

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    fetchAgentPermissions(agent.id);
  };

  const handlePermissionChange = (service: keyof AgentPermissions, permission: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [service]: checked
        ? [...prev[service], permission]
        : prev[service].filter(p => p !== permission)
    }));
  };

  const handlePermissionLevelSelect = (level: keyof typeof PERMISSION_LEVELS) => {
    setPermissions(PERMISSION_LEVELS[level]);
  };

  const savePermissions = async () => {
    if (!selectedAgent) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/agent-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          permissions
        })
      });

      if (response.ok) {
        alert('Permissions saved successfully!');
      } else {
        alert('Failed to save permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error saving permissions');
    }
    setSaving(false);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const username = newAgentData.username ||
      newAgentData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newAgentData.name,
          email: newAgentData.email,
          username: username,
          phone_number: newAgentData.phone_number,
          assigned_cli_ids: newAgentData.assigned_cli_ids
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedAgentCredentials(data.agent);
        setShowCreateModal(false);
        setShowSuccessModal(true);
        fetchAgents();
        setNewAgentData({ name: '', email: '', username: '', phone_number: '', assigned_cli_ids: [] });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Error creating agent');
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!selectedAgent || !confirm(`Are you sure you want to reset password for ${selectedAgent.username}?`)) return;

    setSaving(true);
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    try {
      const response = await fetch('/api/agents/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          newPassword: newPassword
        })
      });

      if (response.ok) {
        setCreatedAgentCredentials({
          username: selectedAgent.username,
          password: newPassword
        });
        setShowSuccessModal(true);
      } else {
        alert('Failed to reset password');
      }
    } catch (error) {
      alert('Error resetting password');
    }
    setSaving(false);
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent || !confirm(`Are you sure you want to DELETE ${selectedAgent.username}?`)) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/agents?id=${selectedAgent.id}&action=delete`, { method: 'DELETE' });
      if (response.ok) {
        alert('Agent deleted');
        setSelectedAgent(null);
        fetchAgents();
      } else {
        alert('Failed to delete agent');
      }
    } catch (error) {
      alert('Error deleting agent');
    }
    setSaving(false);
  };


  if (loading) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${selectedAgent ? styles.mobileShowPanel : ''}`}>
      {/* Sidebar: Agents List */}
      <div className={styles.agentsList}>
        <h4 style={{ fontSize: '17px', fontWeight: '300' }}>Select Agent</h4>
        <div className={styles.agentsScrollArea}>
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`${styles.agentItem} ${selectedAgent?.id === agent.id ? styles.selected : ''}`}
              onClick={() => handleAgentSelect(agent)}
            >
              <div className={styles.agentInfo}>
                <strong>{agent.full_name || agent.username}</strong>
                <span>{agent.email || agent.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Permissions */}
      <div className={styles.permissionsPanel}>
        {selectedAgent ? (
          <>
            <div className={styles.agentHeader}>
              <div className={styles.headerLeft}>
                <button
                  className={styles.mobileBackButton}
                  onClick={() => setSelectedAgent(null)}
                >
                  <i className="fa-thin fa-sharp fa-arrow-left"></i>
                </button>
                <h4>{selectedAgent.full_name || selectedAgent.username}</h4>
              </div>
              <div className={styles.permissionLevels}>
                <label>Quick Setup:</label>
                <select onChange={(e) => handlePermissionLevelSelect(e.target.value as keyof typeof PERMISSION_LEVELS)}>
                  <option value="">Custom / Select Level</option>
                  <option value="view_only">View Only</option>
                  <option value="regular">Regular Agent</option>
                  <option value="senior">Senior Agent</option>
                  <option value="super">Super Agent</option>
                </select>
              </div>
            </div>

            <div className={styles.permissionsContent}>
              {isRefreshing ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                </div>
              ) : Object.entries(PERMISSION_OPTIONS).map(([service, servicePermissions]) => (
                <div key={service} className={styles.serviceSection}>
                  <h4 style={{ textTransform: 'capitalize' }}>{service}</h4>
                  <div className={styles.permissionsGrid}>
                    {servicePermissions.map(permission => (
                      <label key={permission} className={styles.permissionItem}>
                        <input
                          type="checkbox"
                          checked={permissions[service as keyof AgentPermissions]?.includes(permission)}
                          onChange={(e) => handlePermissionChange(
                            service as keyof AgentPermissions,
                            permission,
                            e.target.checked
                          )}
                        />
                        <span>{getPermissionDisplayName(permission)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <button onClick={savePermissions} disabled={saving} className={styles.saveButton}>
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
              <button onClick={() => fetchAgentPermissions(selectedAgent.id)} disabled={saving} className={styles.refreshButton}>
                Refresh
              </button>
              <button onClick={handleResetPassword} disabled={saving} className={styles.resetButton}>
                Reset Pwd
              </button>
              <button onClick={handleDeleteAgent} disabled={saving} className={styles.deleteButton}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <p>Select an agent from the left sidebar to manage permissions</p>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          className={styles.floatingButton}
          onClick={() => setShowCreateModal(true)}
          title="Create New Agent"
        >
          <i className="fa-light fa-plus"></i>
        </button>
      </div>

      {/* Create Agent Modal - ServiceModal Style */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Agent</h2>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowCreateModal(false)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#666' }}
              >
                <i className="fa-light fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className={styles.formContent}>
              <div className={styles.gridForm}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={newAgentData.name}
                    onChange={e => setNewAgentData({ ...newAgentData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email (Optional)</label>
                  <input
                    type="email"
                    value={newAgentData.email}
                    onChange={e => setNewAgentData({ ...newAgentData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Username (Optional)</label>
                  <input
                    type="text"
                    value={newAgentData.username}
                    onChange={e => setNewAgentData({ ...newAgentData, username: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={newAgentData.phone_number}
                    onChange={e => setNewAgentData({ ...newAgentData, phone_number: e.target.value })}
                    placeholder="e.g. 919876543210"
                  />
                </div>

                {/* <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Assign CLI Numbers</label>
                  <div className={styles.cliBox}>
                    {cliNumbers.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '13px' }}>No CLI numbers available.</p>
                    ) : (
                      cliNumbers.map(cli => (
                        <div key={cli.id} className={styles.cliItem}>
                          <input
                            type="checkbox"
                            id={`cli-${cli.id}`}
                            checked={newAgentData.assigned_cli_ids.includes(cli.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAgentData(prev => ({ ...prev, assigned_cli_ids: [...prev.assigned_cli_ids, cli.id] }));
                              } else {
                                setNewAgentData(prev => ({ ...prev, assigned_cli_ids: prev.assigned_cli_ids.filter(id => id !== cli.id) }));
                              }
                            }}
                          />
                          <label htmlFor={`cli-${cli.id}`}>
                            {cli.display_name} ({cli.number})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div> */}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={styles.saveButton}
                >
                  {saving ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={styles.spinnerSmall}></div>
                      <span>Creating...</span>
                    </div>
                  ) : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdAgentCredentials && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader}>
              <h2 style={{ fontSize: '18px', color: '#15803d' }}>Success</h2>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowSuccessModal(false)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '##666' }}
              >
                <i className="fa-light fa-xmark"></i>
              </button>
            </div>

            <div className={styles.formContent}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <i className="fa-sharp fa-thin fa-check-circle" style={{ fontSize: '56px', color: '#15803d', marginBottom: '16px', display: 'block' }}></i>
                <p style={{ color: '#334155', fontWeight: '300', fontSize: '15px', lineHeight: '1.5' }}>
                  Credentials generated successfully. <br />
                  Please save them now as they won't be visible again.
                </p>
              </div>

              <div className={styles.credentialsBox}>
                <div className={styles.credentialRow}>
                  <span style={{ color: '#64748b' }}>Username</span>
                  <span className={styles.credentialValue}>{createdAgentCredentials.username}</span>
                </div>
                <div className={styles.credentialRow}>
                  <span style={{ color: '#64748b' }}>Password</span>
                  <span className={styles.credentialValue}>{createdAgentCredentials.password}</span>
                </div>
              </div>

              <div className={styles.modalActions} style={{ borderTop: 'none', padding: '0', marginTop: '24px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className={styles.saveButton}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
