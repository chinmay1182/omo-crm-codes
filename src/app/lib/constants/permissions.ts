// Centralized Permission Constants

export const PERMISSIONS = {
    VOIP: {
        // Current Keys
        VIEW_ALL: 'view_all_calls',
        VIEW_ASSIGNED: 'view_assigned_calls_only',
        MAKE_CALLS: 'make_calls',
        TRANSFER_CALLS: 'transfer_calls',
        CONFERENCE_CALLS: 'conference_calls',

        // Legacy mapping (for backward compat)
        LEGACY: {
            VIEW_ALL: 'view_all',
            VIEW_ASSIGNED: 'view_assigned',
            CALL: 'call',
            TRANSFER: 'transfer',
            CONFERENCE: 'conference'
        }
    },
    WHATSAPP: {
        // Current Keys
        VIEW_ALL: 'view_all_chats',
        VIEW_ASSIGNED: 'view_assigned_chats',
        REPLY_ALL: 'reply_all_chats',
        REPLY_ASSIGNED: 'reply_assigned_chats',
        TRANSFER_CHATS: 'transfer_chats',

        // Legacy mapping
        LEGACY: {
            VIEW_ALL: 'view_all',
            VIEW_ASSIGNED: 'view_assigned'
        }
    },
    ADMIN: {
        MANAGE_AGENTS: 'manage_agents',
        VIEW_REPORTS: 'view_reports',
        MANAGE_SETTINGS: 'manage_settings'
    }
} as const;

// Helper to check if a permission list has either the new or legacy key
export const hasPermission = (userPermissions: string[], permissionKey: string, legacyKey?: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.includes(permissionKey) || (legacyKey ? userPermissions.includes(legacyKey) : false);
};
