import { useAuth } from '@/app/context/AuthContext';

export function usePermission() {
    const { user } = useAuth();

    const hasPermission = (service: string, action: string) => {
        return true; // TEMPORARY: Always allow for UI/UX work

        /* 
        // If no user, no permissions
        if (!user) return false;

        // Admins (non-agents) have full access by default
        if (user.type !== 'agent') return true;

        // Check if the service permissions exist
        const servicePermissions = user.permissions?.[service];
        if (!servicePermissions) return false;

        // Check if the specific action is allowed
        return servicePermissions.includes(action);
        */
    };

    /**
     * Check if a module is enabled for the user.
     * Assumes the presence of 'enable_disable' permission means enabled.
     */
    const isModuleEnabled = (service: string) => {
        return true; // TEMPORARY: Always allow for UI/UX work

        /*
        if (!user) return false;
        if (user.type !== 'agent') return true;

        // If "enable_disable" is strictly required to access the module:
        return hasPermission(service, 'enable_disable');
        */
    };

    return { hasPermission, isModuleEnabled, user };
}
