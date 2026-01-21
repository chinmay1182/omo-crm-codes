import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        // Check Agent Permissions
        const cookieStore = await cookies();
        const agentSession = cookieStore.get('agent_session');
        let agentId: string | null = null;
        let agentPermissions: any = null;

        let isSuperAgent = false;
        let isAdmin = false;

        if (agentSession) {
            try {
                const sessionData = JSON.parse(agentSession.value);
                const agent = sessionData.user || sessionData;
                agentId = agent.id;
                agentPermissions = agent.permissions;

                // Check if user is Super Agent or Admin
                if (agent.roles) {
                    // Handle both string array and object array for roles
                    isSuperAgent = Array.isArray(agent.roles) && agent.roles.some((r: any) =>
                        r === 'Super Agent' || r.name === 'Super Agent'
                    );
                }

                // Check for admin permissions
                isAdmin = agentPermissions?.admin && agentPermissions.admin.length > 0;

            } catch (e) {
                console.error("Error parsing agent session", e);
            }
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        let query = supabase
            .from('company_notes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        // Enforce View Permissions
        if (agentId) {
            // Bypass restrictions for Admins and Super Agents
            if (isAdmin || isSuperAgent) {
                // Have full access, do nothing to query
            } else if (agentPermissions) {
                const canViewAll = agentPermissions.notes?.includes('view_all');
                const canViewAssigned = agentPermissions.notes?.includes('view_assigned'); // Interpreted as 'view own notes'

                if (!canViewAll) {
                    if (canViewAssigned && agentId) {
                        // Assuming created_by stores the user/agent ID
                        query = query.eq('created_by', agentId);
                    } else {
                        return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
                    }
                }
            } else {
                // If agent has no permissions object at all, default to deny for safety
                return NextResponse.json({ error: 'Access Denied: No permissions found' }, { status: 403 });
            }
        }

        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }

        const { data: notes, error } = await query;

        if (error) throw error;

        return NextResponse.json(notes);
    } catch (error) {
        console.error('Error fetching all notes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notes' },
            { status: 500 }
        );
    }
}

