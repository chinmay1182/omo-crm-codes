// Default Role Permissions
// This file acts as the source of truth for default role configurations.

export const PERMISSION_OPTIONS: Record<string, string[]> = {
    /* whatsapp: [
        'reply_all', // Reply to any chat
        'reply_assigned', // Reply to assigned chats only
        'view_all', // View all chats
        'view_assigned' // View assigned chats only
    ],
    voip: [
        'view_all_calls',
        'view_assigned_calls_only',
        'make_calls',
        'transfer_calls', // Transfer active calls
        'conference_calls' // Add people to calls
    ], */
    admin: [
        'view_reports',
        'manage_agents', // Edit other agents
        'manage_roles',
        'system_settings'
    ],
    contacts: [
        'enable_disable', // Can access the module
        'view_all',
        'view_assigned',
        'create',
        'edit',
        'delete',
        'view_unmasked' // Can see full phone/email
    ],
    services: [
        'enable_disable',
        'create',
        'edit',
        'delete'
    ],
    tasks: [
        'enable_disable',
        'create',
        'edit',
        'delete'
    ],
    notes: [
        'enable_disable',
        'create',
        'edit',
        'delete'
    ],
    tickets: [
        'enable_disable',
        'view_all',
        'view_assigned',
        'create',
        'edit',
        'transfer_ticket',
        'delete'
    ],
    leads: [
        'enable_disable',
        'view_all',
        'view_assigned',
        'edit',
        'transfer_lead',
        'delete',
        'proposal_create',
        'proposal_edit',
        'proposal_delete'
    ],
    forms: [
        'enable_disable',
        'view_all',
        'create',
        'edit', // Edit form structure
        'delete'
    ],
    scheduling: [
        'enable_disable',
        'create',
        'edit',
        'delete'
    ],
    meetings: [
        'enable_disable',
        'view_all',
        'view_assigned',
        'create',
        'edit',
        'delete'
    ]
};

export interface AgentPermissions {
    [module: string]: string[];
}

export const PERMISSION_LEVELS: Record<string, AgentPermissions> = {
    regular: {
        whatsapp: ['reply_assigned', 'view_assigned'],
        voip: ['view_assigned_calls_only', 'make_calls'],
        admin: [],
        contacts: ['enable_disable', 'view_assigned', 'create', 'edit'],
        services: [],
        tasks: ['enable_disable', 'create', 'edit'],
        notes: ['enable_disable', 'create'],
        tickets: ['enable_disable', 'view_assigned', 'create'],
        leads: ['enable_disable', 'view_assigned', 'proposal_create'],
        forms: [],
        scheduling: [],
        meetings: ['enable_disable', 'view_assigned', 'create', 'edit']
    },
    senior: {
        whatsapp: ['reply_all', 'reply_assigned', 'view_all', 'view_assigned'],
        voip: ['view_all_calls', 'make_calls', 'transfer_calls'],
        admin: [],
        contacts: ['enable_disable', 'view_all', 'create', 'edit', 'delete'],
        services: ['enable_disable'],
        tasks: ['enable_disable', 'create', 'edit'],
        notes: ['enable_disable', 'create', 'edit'],
        tickets: ['enable_disable', 'view_all', 'create', 'edit'],
        leads: ['enable_disable', 'view_all', 'edit', 'proposal_create', 'proposal_edit'],
        forms: ['enable_disable', 'view_all'],
        scheduling: ['enable_disable'],
        meetings: ['enable_disable', 'view_all', 'create', 'edit', 'delete']
    },
    super: {
        whatsapp: ['reply_all', 'reply_assigned', 'view_all', 'view_assigned'],
        voip: ['view_all_calls', 'view_assigned_calls_only', 'make_calls', 'transfer_calls', 'conference_calls'],
        admin: ['view_reports', 'manage_agents'],
        contacts: ['enable_disable', 'view_all', 'create', 'edit', 'delete', 'view_unmasked'],
        services: ['enable_disable', 'create', 'edit', 'delete'],
        tasks: ['enable_disable', 'create', 'edit', 'delete'],
        notes: ['enable_disable', 'create', 'edit', 'delete'],
        tickets: ['enable_disable', 'view_all', 'create', 'edit', 'transfer_ticket', 'delete'],
        leads: ['enable_disable', 'view_all', 'edit', 'transfer_lead', 'delete', 'proposal_create', 'proposal_edit', 'proposal_delete'],
        forms: ['enable_disable', 'view_all', 'create', 'edit', 'delete'],
        scheduling: ['enable_disable', 'create', 'edit', 'delete'],
        meetings: ['enable_disable', 'view_all', 'create', 'edit', 'delete']
    },
    view_only: {
        whatsapp: ['view_assigned'],
        voip: ['view_assigned_calls_only'],
        admin: [],
        contacts: ['enable_disable', 'view_assigned'],
        services: ['enable_disable'],
        tasks: ['enable_disable'],
        notes: ['enable_disable'],
        tickets: ['enable_disable', 'view_assigned'],
        leads: ['enable_disable', 'view_assigned'],
        forms: ['enable_disable'],
        scheduling: ['enable_disable'],
        meetings: ['enable_disable', 'view_assigned']
    }
};
