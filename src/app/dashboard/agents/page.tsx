"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import styles from "./styles.module.css";

interface Agent {
  id: number;
  username: string;
  email: string;
  full_name: string;
  status: "active" | "inactive" | "suspended";
  roles: string;
  created_at: string;
  last_login: string;
  created_by_email: string;
  permissions?: {
    whatsapp: string[];
    voip: string[];
    contacts?: string[];
    services?: string[];
    tasks?: string[];
    notes?: string[];
    tickets?: string[];
    leads?: string[];
    forms?: string[];
    scheduling?: string[];
    meetings?: string[];
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: any;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showUnmasked, setShowUnmasked] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [passwordResetData, setPasswordResetData] = useState<{
    username: string;
    newPassword: string;
  } | null>(null);

  // Utility function for masking email
  const maskEmail = (email: string) => {
    if (!email) return "-";
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 4) return email; // Don't mask very short emails

    const firstTwo = localPart.substring(0, 2);
    const lastTwo = localPart.substring(localPart.length - 2);
    const maskedLocal = firstTwo + "*".repeat(localPart.length - 4) + lastTwo;

    return `${maskedLocal}@${domain}`;
  };

  const toggleMask = (agentId: number, field: string) => {
    const key = `${agentId}-${field}`;
    setShowUnmasked((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    selectedRoles: [] as number[],
    whatsappPermissions: [] as string[],
    voipPermissions: [] as string[],
    contactsPermissions: [] as string[],
    servicesPermissions: [] as string[],
    tasksPermissions: [] as string[],
    notesPermissions: [] as string[],
    ticketsPermissions: [] as string[],
    leadsPermissions: [] as string[],
    formsPermissions: [] as string[],
    schedulingPermissions: [] as string[],
    meetingsPermissions: [] as string[],
  });

  useEffect(() => {
    fetchAgents();
    fetchRoles();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/agents?includePermissions=true");
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
      } else {
        toast.error("Failed to fetch agents");
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Error fetching agents");
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          roles: formData.selectedRoles,
          permissions: {
            whatsapp: formData.whatsappPermissions,
            voip: formData.voipPermissions,
            contacts: formData.contactsPermissions,
            services: formData.servicesPermissions,
            tasks: formData.tasksPermissions,
            notes: formData.notesPermissions,
            tickets: formData.ticketsPermissions,
            leads: formData.leadsPermissions,
            forms: formData.formsPermissions,
            scheduling: formData.schedulingPermissions,
            meetings: formData.meetingsPermissions,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Agent created! Username: ${data.agent.username}, Password: ${data.agent.password}`
        );
        setShowCreateModal(false);
        resetForm();
        fetchAgents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create agent");
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("Error creating agent");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setLoading(true);

    const payload = {
      id: editingAgent.id,
      email: formData.email,
      full_name: formData.full_name,
      status: editingAgent.status,
      roles: formData.selectedRoles,
      permissions: {
        whatsapp: formData.whatsappPermissions,
        voip: formData.voipPermissions,
        contacts: formData.contactsPermissions,
        services: formData.servicesPermissions,
        tasks: formData.tasksPermissions,
        notes: formData.notesPermissions,
        tickets: formData.ticketsPermissions,
        leads: formData.leadsPermissions,
        forms: formData.formsPermissions,
        scheduling: formData.schedulingPermissions,
        meetings: formData.meetingsPermissions,
      },
    };


    try {
      const response = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Agent updated successfully");
        setEditingAgent(null);
        resetForm();
        fetchAgents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update agent");
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error("Error updating agent");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (agentId: number, newStatus: string) => {
    try {
      const response = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: agentId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(`Agent ${newStatus} successfully`);
        fetchAgents();
      } else {
        toast.error("Failed to update agent status");
      }
    } catch (error) {
      console.error("Error updating agent status:", error);
      toast.error("Error updating agent status");
    }
  };

  const handleResetPassword = async (agentId: number) => {
    if (
      !confirm(
        "Are you sure you want to reset this agent's password? A new password will be generated."
      )
    )
      return;

    try {
      const response = await fetch("/api/agents/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordResetData({
          username: data.agent.username,
          newPassword: data.agent.newPassword,
        });

        toast.success("Password reset successfully!");
        fetchAgents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Error resetting password");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Password copied to clipboard!");
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Password copied to clipboard!");
    }
  };

  const handleDeleteAgent = async (
    agentId: number,
    action: "suspend" | "delete"
  ) => {
    if (!confirm(`Are you sure you want to ${action} this agent?`)) return;

    try {
      const response = await fetch(
        `/api/agents?id=${agentId}&action=${action}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success(`Agent ${action}ed successfully`);
        fetchAgents();
      } else {
        toast.error(`Failed to ${action} agent`);
      }
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
      toast.error(`Error ${action}ing agent`);
    }
  };


  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      full_name: "",
      selectedRoles: [],
      whatsappPermissions: [],
      voipPermissions: [],
      contactsPermissions: [],
      servicesPermissions: [],
      tasksPermissions: [],
      notesPermissions: [],
      ticketsPermissions: [],
      leadsPermissions: [],
      formsPermissions: [],
      schedulingPermissions: [],
      meetingsPermissions: [],
    });
  };

  const openEditModal = (agent: Agent) => {
    const roleIds = agent.roles
      ? agent.roles.split(",").map((role) => {
        const foundRole = roles.find((r) => r.name === role.trim());
        return foundRole ? foundRole.id : null;
      }).filter((id) => id !== null) as number[]
      : [];

    let parsedPermissions: any = agent.permissions || {};
    // Safety check if permissions is a string
    if (typeof parsedPermissions === 'string') {
      try {
        parsedPermissions = JSON.parse(parsedPermissions);
      } catch (e) {
        console.error("Failed to parse agent permissions string:", e);
        parsedPermissions = {};
      }
    }

    setEditingAgent(agent);
    setFormData({
      username: agent.username,
      email: agent.email || "",
      full_name: agent.full_name || "",
      selectedRoles: roleIds,
      whatsappPermissions: parsedPermissions.whatsapp || [],
      voipPermissions: parsedPermissions.voip || [],
      contactsPermissions: parsedPermissions.contacts || [],
      servicesPermissions: parsedPermissions.services || [],
      tasksPermissions: parsedPermissions.tasks || [],
      notesPermissions: parsedPermissions.notes || [],
      ticketsPermissions: parsedPermissions.tickets || [],
      leadsPermissions: parsedPermissions.leads || [],
      formsPermissions: parsedPermissions.forms || [],
      schedulingPermissions: parsedPermissions.scheduling || [],
      meetingsPermissions: parsedPermissions.meetings || [],
    });
  };

  const whatsappPermissionOptions = [
    { value: "view_all", label: "View All Chats" },
    { value: "view_assigned", label: "View Assigned Chats Only" },
    { value: "reply_all", label: "Reply to All Chats" },
    { value: "reply_assigned", label: "Reply to Assigned Chats Only" },
    { value: "agent_chat", label: "Agent Chat Access" },
    { value: "transfer", label: "Transfer Chats" },
  ];

  const voipPermissionOptions = [
    { value: "view_all_calls", label: "View All Calls" },
    { value: "view_assigned_calls_only", label: "View Assigned Calls Only" },
    { value: "make_calls", label: "Make Calls" },
    { value: "transfer_calls", label: "Transfer Calls" },
    { value: "conference_calls", label: "Conference Calls" },
  ];

  const contactPermissionOptions = [
    { value: "view_all", label: "View All Contacts" },
    { value: "view_assigned", label: "View Assigned Contacts Only" },
    { value: "create", label: "Create Contacts" },
    { value: "edit", label: "Edit Contacts (Read-only Restriction)" }, // UI Label implies capability to edit, but request says "restriction to edit". Let's assume these are ENABLE permissions.
    { value: "view_unmasked", label: "View Unmasked Contact Info" },
    { value: "edit", label: "Edit Contacts" },
    { value: "delete", label: "Delete Contacts" },
  ];

  const servicePermissionOptions = [
    { value: "enable_disable", label: "Enable/Disable Services" },
    { value: "create", label: "Create Services" },
    { value: "edit", label: "Edit Services" },
    { value: "delete", label: "Delete Services" },
  ];

  const taskPermissionOptions = [
    { value: "enable_disable", label: "View/Access Tasks" },
    { value: "create", label: "Create Tasks" }, // Implicit
    { value: "edit", label: "Edit Tasks" },
    { value: "delete", label: "Delete Tasks" },
  ];

  const notePermissionOptions = [
    { value: "enable_disable", label: "View/Access Notes" },
    { value: "create", label: "Create Notes" },
    { value: "edit", label: "Edit Notes" },
    { value: "delete", label: "Delete Notes" },
  ];

  const ticketPermissionOptions = [
    { value: "enable_disable", label: "View/Access Tickets" },
    { value: "view_all", label: "View All Tickets" },
    { value: "view_assigned", label: "View Assigned Tickets Only" },
    { value: "create", label: "Create Tickets" },
    { value: "edit", label: "Edit Tickets" },
    { value: "delete", label: "Delete Tickets" },
  ];

  const leadPermissionOptions = [
    { value: "enable_disable", label: "View/Access Leads" },
    { value: "view_all", label: "View All Leads" },
    { value: "view_assigned", label: "View Assigned Leads Only" },
    { value: "edit", label: "Edit Leads" },
    { value: "delete", label: "Delete Leads" },
    // Proposals are often part of leads
    { value: "proposal_create", label: "Create Proposals" },
    { value: "proposal_edit", label: "Edit Proposals" },
    { value: "proposal_delete", label: "Delete Proposals" },
  ];

  const formPermissionOptions = [
    { value: "enable_disable", label: "View/Access Form Builder" },
    { value: "create", label: "Create Forms" },
    { value: "edit", label: "Edit Forms" },
    { value: "delete", label: "Delete Forms" },
  ];

  const schedulingPermissionOptions = [
    { value: "enable_disable", label: "View/Access Scheduling" },
    { value: "create", label: "Create Schedules" },
    { value: "edit", label: "Edit Schedules" },
    { value: "delete", label: "Delete Schedules" },
  ];

  const meetingPermissionOptions = [
    { value: "enable_disable", label: "Access Meetings Module" },
  ];

  const renderPermissionGroup = (
    label: string,
    options: { value: string; label: string }[],
    selected: string[],
    key: keyof typeof formData
  ) => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <div className={styles.checkboxGroup}>
        {options.map((option) => (
          <label key={option.value} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={selected?.includes(option.value)}
              onChange={(e) => {
                const currentSelected = (formData[key] as string[]) || [];
                if (e.target.checked) {
                  setFormData({
                    ...formData,
                    [key]: [...currentSelected, option.value],
                  });
                } else {
                  setFormData({
                    ...formData,
                    [key]: currentSelected.filter((p) => p !== option.value),
                  });
                }
              }}
              disabled={loading}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          <button className={`${styles.navTab} ${styles.active}`}>
            Team Oversight
          </button>
          <button className={styles.navTab}>
            Roles & Permissions
          </button>
        </div>
        <div className={styles.topActions}>
          {/* Placeholder for actions if needed */}
        </div>
      </div>

      {/* Description below nav or inside? LeadsList has no description text usually. 
          I'll hide the old description to match standard. 
      */}

      {/* Agents Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td data-label="Username">{agent.username}</td>
                <td data-label="Full Name">{agent.full_name || "-"}</td>
                <td data-label="Email">
                  <div className={styles.maskedField}>
                    <span>
                      {showUnmasked[`${agent.id}-email`]
                        ? agent.email || "-"
                        : maskEmail(agent.email)}
                    </span>
                    {agent.email && (
                      <button
                        className={styles.toggleButton}
                        onClick={() => toggleMask(agent.id, "email")}
                        title={
                          showUnmasked[`${agent.id}-email`]
                            ? "Hide email"
                            : "Show email"
                        }
                      >
                        <i
                          className={`fa-light ${showUnmasked[`${agent.id}-email`]
                            ? "fa-eye-slash"
                            : "fa-eye"
                            }`}
                        ></i>
                      </button>
                    )}
                  </div>
                </td>

                <td data-label="Roles">{agent.roles || "No roles"}</td>
                <td data-label="Status">
                  <select
                    value={agent.status}
                    onChange={(e) =>
                      handleStatusChange(agent.id, e.target.value)
                    }
                    className={`${styles.statusSelect} ${styles[agent.status]}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td data-label="Last Login">
                  {agent.last_login
                    ? new Date(agent.last_login).toLocaleString()
                    : "Never"}
                </td>
                <td data-label="Actions">
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.editButton}
                      onClick={() => openEditModal(agent)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.suspendButton}
                      onClick={() => handleDeleteAgent(agent.id, "suspend")}
                    >
                      Suspend
                    </button>
                    <button
                      className={styles.resetButton}
                      onClick={() => handleResetPassword(agent.id)}
                    >
                      Reset Password
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteAgent(agent.id, "delete")}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className={styles.floatingButton}
        onClick={() => setShowCreateModal(true)}
        title="Create New Agent"
      >
        <i className="fa-light fa-plus"></i>
      </button>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAgent) && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingAgent ? "Edit Agent" : "Create New Agent"}</h2>
              </div>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAgent(null);
                  resetForm();
                }}
                disabled={loading}
              >
                <i className="fa-light fa-xmark"></i>
              </button>
            </div>
            <form
              className={styles.formContent}
              onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
            >
              {!editingAgent && (
                <div className={styles.formGroup}>
                  <label>Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Roles</label>
                <div className={styles.checkboxGroup}>
                  {roles.map((role) => (
                    <label key={role.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedRoles: [
                                ...formData.selectedRoles,
                                role.id,
                              ],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedRoles: formData.selectedRoles.filter(
                                (id) => id !== role.id
                              ),
                            });
                          }
                        }}
                        disabled={loading}
                      />
                      {role.name}
                      <small>{role.description}</small>
                    </label>
                  ))}
                </div>
              </div>


              {renderPermissionGroup("WhatsApp Permissions", whatsappPermissionOptions, formData.whatsappPermissions, "whatsappPermissions")}
              {renderPermissionGroup("VoIP Permissions", voipPermissionOptions, formData.voipPermissions, "voipPermissions")}
              {renderPermissionGroup("Contact Permissions", contactPermissionOptions, formData.contactsPermissions, "contactsPermissions")}
              {renderPermissionGroup("Service Permissions", servicePermissionOptions, formData.servicesPermissions, "servicesPermissions")}
              {renderPermissionGroup("Task Permissions", taskPermissionOptions, formData.tasksPermissions, "tasksPermissions")}
              {renderPermissionGroup("Note Permissions", notePermissionOptions, formData.notesPermissions, "notesPermissions")}
              {renderPermissionGroup("Ticket Permissions", ticketPermissionOptions, formData.ticketsPermissions, "ticketsPermissions")}
              {renderPermissionGroup("Lead Management Permissions", leadPermissionOptions, formData.leadsPermissions, "leadsPermissions")}
              {renderPermissionGroup("Form Builder Permissions", formPermissionOptions, formData.formsPermissions, "formsPermissions")}
              {renderPermissionGroup("Scheduling Permissions", schedulingPermissionOptions, formData.schedulingPermissions, "schedulingPermissions")}
              {renderPermissionGroup("Meeting Permissions", meetingPermissionOptions, formData.meetingsPermissions, "meetingsPermissions")}


              <div className={styles.modalActions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={loading}
                >
                  {loading
                    ? "Processing..."
                    : editingAgent
                      ? "Update Agent"
                      : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetData && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Password Reset Successful</h2>
            <div className={styles.passwordResetInfo}>
              <p>The password has been reset for the following agent:</p>

              <div className={styles.credentialsBox}>
                <div className={styles.credentialRow}>
                  <label>Username:</label>
                  <span className={styles.credentialValue}>
                    {passwordResetData.username}
                  </span>
                </div>

                <div className={styles.credentialRow}>
                  <label>New Password:</label>
                  <div className={styles.passwordField}>
                    <span className={styles.credentialValue}>
                      {passwordResetData.newPassword}
                    </span>
                    <button
                      type="button"
                      className={styles.copyButton}
                      onClick={() =>
                        copyToClipboard(passwordResetData.newPassword)
                      }
                      title="Copy password to clipboard"
                    >
                      <i className="fa-light fa-copy"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.warningMessage}>
                <i className="fa-light fa-exclamation-triangle"></i>
                <span>
                  Please save this password securely and share it with the agent
                  through a secure channel.
                </span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setPasswordResetData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
