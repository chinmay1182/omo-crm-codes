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
  const [saving, setSaving] = useState(false);
  const [cliNumbers, setCliNumbers] = useState<any[]>([]);

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
        console.error('Failed to fetch permissions:', response.statusText);
        // Reset permissions on error
        setPermissions({
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
      }
    } catch (error) {
      console.error('Error fetching agent permissions:', error);
      // Reset permissions on error
      setPermissions({
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
    }
  };

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

  const setupDefaultPermissions = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/setup-agent-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchAgents();
      } else {
        alert('Failed to setup default permissions');
      }
    } catch (error) {
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!selectedAgent) return;

    if (!confirm(`Are you sure you want to reset the password for ${selectedAgent.username}?`)) {
      return;
    }

    setSaving(true);
    // Generate a random password on client side since the API expects 'newPassword'
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
        const error = await response.json();
        alert(error.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password');
    }
    setSaving(false);
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;

    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedAgent.username}? This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/agents?id=${selectedAgent.id}&action=delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Agent deleted successfully');
        setSelectedAgent(null);
        fetchAgents();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Error deleting agent');
    }
    setSaving(false);
  };

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

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Auto-generate username if not provided
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
          // Password will be auto-generated by backend
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedAgentCredentials(data.agent);
        setShowCreateModal(false);
        setShowSuccessModal(true);
        fetchAgents(); // Refresh list
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

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner size="large" text="Loading agents..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h4>Agent Permissions Management</h4>
          <p>Configure access controls and permissions for team members</p>
        </div>
        <div className={styles.headerActions}>

          <button
            onClick={setupDefaultPermissions}
            disabled={saving}
            className={styles.secondaryButton}
          >
            {saving ? 'Setting up...' : 'Setup Default Permissions'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.agentsList}>
          <h4>Select Agent</h4>
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`${styles.agentItem} ${selectedAgent?.id === agent.id ? styles.selected : ''}`}
              onClick={() => handleAgentSelect(agent)}
            >
              <div className={styles.agentInfo}>
                <strong>{agent.full_name || agent.username}</strong>
                <span>{agent.email}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedAgent && (
          <div className={styles.permissionsPanel}>
            <div className={styles.agentHeader}>
              <h4>Permissions for {selectedAgent.full_name || selectedAgent.username}</h4>
              <div className={styles.permissionLevels}>
                <label>Quick Setup:</label>
                <select onChange={(e) => handlePermissionLevelSelect(e.target.value as keyof typeof PERMISSION_LEVELS)}>
                  <option value="">Select Level</option>
                  <option value="view_only">View Only</option>
                  <option value="regular">Regular Agent</option>
                  <option value="senior">Senior Agent</option>
                  <option value="super">Super Agent</option>
                </select>
              </div>
            </div>

            {Object.entries(PERMISSION_OPTIONS).map(([service, servicePermissions]) => (
              <div key={service} className={styles.serviceSection}>
                <h4>{service.toUpperCase()} Permissions</h4>
                <div className={styles.permissionsGrid}>
                  {servicePermissions.map(permission => (
                    <label key={permission} className={styles.permissionItem}>
                      <input
                        type="checkbox"
                        checked={permissions[service as keyof AgentPermissions].includes(permission)}
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

            <div className={styles.actions}>
              <button
                onClick={savePermissions}
                disabled={saving}
                className={styles.primaryButton}
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
              <button
                onClick={() => selectedAgent && fetchAgentPermissions(selectedAgent.id)}
                disabled={saving}
                className={styles.refreshButton}
              >
                Refresh Permissions
              </button>
              <button
                onClick={handleResetPassword}
                disabled={saving}
                className={styles.refreshButton}
                style={{ backgroundColor: '#ffc107', color: 'black' }}
              >
                Reset Password
              </button>
              <button
                onClick={handleDeleteAgent}
                disabled={saving}
                className={styles.refreshButton}
                style={{ backgroundColor: '#dc3545', color: 'white' }}
              >
                Delete Agent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className={styles.floatingButton}
        onClick={() => setShowCreateModal(true)}
        title="Create New Agent"
      >
        <i className="fa-light fa-plus"></i>
      </button>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Create New Agent</h2>
            <form onSubmit={handleCreateAgent}>
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
                <label>Username (Optional - Auto-generated if empty)</label>
                <input
                  type="text"
                  value={newAgentData.username}
                  onChange={e => setNewAgentData({ ...newAgentData, username: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Mobile Number (For Agent Calls)</label>
                <input
                  type="text"
                  value={newAgentData.phone_number}
                  onChange={e => setNewAgentData({ ...newAgentData, phone_number: e.target.value })}
                  placeholder="e.g. 919876543210"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Assign CLI Numbers (For Outbound Calls)</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ced4da', padding: '10px', borderRadius: '4px' }}>
                  {cliNumbers.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>No CLI numbers available.</p>
                  ) : (
                    cliNumbers.map(cli => (
                      <div key={cli.id} style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                        <label htmlFor={`cli-${cli.id}`} style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.95rem' }}>
                          {cli.display_name} ({cli.number})
                        </label>
                      </div>
                    ))
                  )}
                </div>
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
                  className={styles.primaryButton}
                >
                  {saving ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Spinner size="small" color="white" />
                      <span>Creating...</span>
                    </div>
                  ) : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal with Credentials */}
      {showSuccessModal && createdAgentCredentials && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 style={{ color: '#28a745' }}>Agent Created Successfully!</h2>
            <p>Please copy these credentials now. The password will <strong>not</strong> be shown again.</p>

            <div className={styles.credentialsBox}>
              <div className={styles.credentialRow}>
                <span className={styles.credentialLabel}>Username:</span>
                <span className={styles.credentialValue}>{createdAgentCredentials.username}</span>
              </div>
              <div className={styles.credentialRow}>
                <span className={styles.credentialLabel}>Password:</span>
                <span className={styles.credentialValue}>{createdAgentCredentials.password}</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowSuccessModal(false)}
                className={styles.createButton}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
