// Helper function to parse agent session cookie
// Handles both nested { user: {...} } and flat {...} structures

export function parseAgentSession(agentSessionValue: string): any {
    try {
        const sessionData = JSON.parse(agentSessionValue);
        // Handle nested structure: { user: {...}, googleTokens: null }
        // Or flat structure: { id, username, permissions, ... }
        return sessionData.user || sessionData;
    } catch (e) {
        console.error('Failed to parse agent session:', e);
        return null;
    }
}

// Helper to get agent from cookie store
export async function getAgentFromCookies(cookieStore: any): Promise<any | null> {
    const agentSession = cookieStore.get('agent_session');
    if (!agentSession) return null;
    return parseAgentSession(agentSession.value);
}
