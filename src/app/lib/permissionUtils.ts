// Utility functions for permission display and management

export const getPermissionDisplayName = (permission: string): string => {
  const permissionMap: { [key: string]: string } = {
    // VoIP permissions
    'view_all_calls': 'View All Calls',
    'view_assigned_calls_only': 'View Assigned Calls Only',
    'make_calls': 'Make Calls',
    'transfer_calls': 'Transfer Calls',
    'conference_calls': 'Conference Calls',

    // WhatsApp permissions
    'reply_all': 'Reply to All Chats',
    'reply_assigned': 'Reply to Assigned Chats',
    'transfer': 'Transfer Chats',

    // Admin permissions
    'view_reports': 'View Reports',
    'manage_agents': 'Manage Agents',
    'system_config': 'System Configuration',

    // Specific Module Extra Permissions
    'transfer_ticket': 'Transfer Ticket/Reassign',
    'transfer_lead': 'Transfer Lead/Reassign',

    // Generic/Module permissions
    'enable_disable': 'Access Module',
    'create': 'Create',
    'edit': 'Edit',
    'delete': 'Delete',
    'view_unmasked': 'View Unmasked Data (Phone/Email)',
    'proposal_create': 'Create Proposal',
    'proposal_edit': 'Edit Proposal',
    'proposal_delete': 'Delete Proposal',

    // Legacy values (for backward compatibility)
    'call': 'Make Calls',
    'view_all': 'View All', // Updated key to match map
    'view_assigned': 'View Assigned',
  };

  return permissionMap[permission] || permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getServiceDisplayName = (service: string): string => {
  const serviceMap: { [key: string]: string } = {
    'voip': 'VoIP Dialer',
    'whatsapp': 'WhatsApp Chats',
    'contacts': 'Client Contacts',
    'services': 'Service List',
    'notes': 'Quick Notes',
    'tasks': 'Task Manager',
    'meetings': 'Meeting Logs',
    'emails': 'Email Inbox',
    'tickets': 'Support Tickets',
    'leads': 'Lead Tracker',
    'forms': 'Form Builder',
    'calendar': 'Global Calendar',
    'scheduling': 'Appointment Slots',
    'admin': 'Administration' // Not in sidebar, but 'Administration' is generic and correct
  };

  return serviceMap[service] || service.charAt(0).toUpperCase() + service.slice(1);
};
