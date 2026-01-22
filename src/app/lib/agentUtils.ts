export const determineAgentType = (permissions: any) => {
    if (!permissions || typeof permissions !== 'object') {
        return 'Regular Agent';
    }

    // Handle both lowercase (API response) and TitleCase (Admin Panel) or map properly
    const whatsapp = permissions.whatsapp || permissions.Whatsapp || [];
    const voip = permissions.voip || permissions.Voip || [];
    const admin = permissions.admin || permissions.Admin || [];

    // Check for Administrator
    if (admin.length > 0 || admin.includes('manage_agents')) {
        return 'Administrator';
    }

    // Check for Super Agent
    if (whatsapp.includes('view_all') && whatsapp.includes('reply_all')) {
        return 'Super Agent';
    }

    // Check for Senior Agent
    if (voip.includes('view_all_calls') && voip.includes('transfer_calls')) {
        return 'Senior Agent';
    }

    // Check for View Only Agent
    if (whatsapp.includes('view_assigned') && !whatsapp.includes('reply_assigned')) {
        return 'View Only Agent';
    }

    // Check for Regular Agent
    if ((whatsapp.includes('view_assigned') && whatsapp.includes('reply_assigned')) ||
        voip.includes('make_calls')) {
        return 'Regular Agent';
    }

    // Fallback
    return 'Regular Agent';
};
