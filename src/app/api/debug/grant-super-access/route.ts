import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { PERMISSION_LEVELS } from '@/app/lib/roleDefaults';

export async function POST(request: Request) {
    try {
        const { agentUsername, roleName } = await request.json();

        if (!agentUsername || !roleName) {
            return NextResponse.json(
                { error: 'Agent username and role name required' },
                { status: 400 }
            );
        }

        // Get agent
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id, username')
            .eq('username', agentUsername)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get role
        const { data: role, error: roleError } = await supabase
            .from('roles')
            .select('id, name')
            .ilike('name', roleName)
            .single();

        if (roleError || !role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Delete existing permissions for this agent
        await supabase
            .from('agent_permissions')
            .delete()
            .eq('agent_id', agent.id);

        // Delete existing role assignments
        await supabase
            .from('agent_roles')
            .delete()
            .eq('agent_id', agent.id);

        // Assign new role
        const { error: roleAssignError } = await supabase
            .from('agent_roles')
            .insert({
                agent_id: agent.id,
                role_id: role.id
            });

        if (roleAssignError) throw roleAssignError;

        // Get default permissions for this role
        const defaultPerms = PERMISSION_LEVELS[roleName.toLowerCase()];

        if (defaultPerms) {
            const permissionInserts: any[] = [];

            for (const [serviceType, permissions] of Object.entries(defaultPerms)) {
                if (Array.isArray(permissions)) {
                    for (const permission of permissions) {
                        permissionInserts.push({
                            agent_id: agent.id,
                            service_type: serviceType,
                            permission_type: permission,
                            permission_value: 'true'
                        });
                    }
                }
            }

            if (permissionInserts.length > 0) {
                const { error: permError } = await supabase
                    .from('agent_permissions')
                    .insert(permissionInserts);

                if (permError) throw permError;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully assigned ${roleName} role to ${agentUsername}`,
            agent: agent.username,
            role: role.name,
            permissionsAdded: defaultPerms ? Object.keys(defaultPerms).length : 0
        });

    } catch (error: any) {
        console.error('Error in grant-super-access:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to grant access' },
            { status: 500 }
        );
    }
}
