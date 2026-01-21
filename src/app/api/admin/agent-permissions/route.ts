import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

async function checkAdminPermissions() {
  const cookieStore = await cookies();
  const agentSession = cookieStore.get('agent_session');

  if (!agentSession) {
    return { authorized: false, error: 'Unauthorized: No session found' };
  }

  try {
    const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
    const permissions = agent.permissions;

    // Strict Check: Must have 'admin' section and 'manage_agents' permission
    if (!permissions?.admin?.includes('manage_agents')) {
      return { authorized: false, error: 'Access Denied: Requires "Manage Agents" permission' };
    }

    return { authorized: true, agentId: agent.id };
  } catch (e) {
    console.error("Error parsing agent session", e);
    return { authorized: false, error: 'Unauthorized: Invalid session' };
  }
}

// Get agent permissions
export async function GET(request: Request) {
  // Permission Check
  const auth = await checkAdminPermissions();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Get agent permissions
    const { data: permissions, error: permError } = await supabase
      .from('agent_permissions')
      .select('service_type, permission_type, permission_value')
      .eq('agent_id', agentId);

    if (permError) throw permError;

    // Get agent roles
    const { data: roleData, error: roleError } = await supabase
      .from('agent_roles')
      .select('roles(name, permissions)')
      .eq('agent_id', agentId);

    if (roleError) throw roleError;

    // Format roles output to match expected structure
    const roles = roleData.map((rd: any) => ({
      name: rd.roles?.name,
      permissions: rd.roles?.permissions
    }));

    return NextResponse.json({
      permissions: permissions || [],
      roles: roles || [],
      agentId: parseInt(agentId)
    });
  } catch (error) {
    console.error('Error fetching agent permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent permissions' },
      { status: 500 }
    );
  }
}

// Update agent permissions
export async function POST(request: Request) {
  // Permission Check
  const auth = await checkAdminPermissions();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const { agentId, permissions } = await request.json();

    if (!agentId || !permissions) {
      return NextResponse.json(
        { error: 'Agent ID and permissions are required' },
        { status: 400 }
      );
    }

    // Delete existing permissions
    const { error: deleteError } = await supabase
      .from('agent_permissions')
      .delete()
      .eq('agent_id', agentId);

    if (deleteError) throw deleteError;

    // Prepare new permissions for batch insert
    const updates: any[] = [];

    // permissions object is like { whatsapp: ['send', 'read'], voip: [] }
    for (const [serviceType, servicePermissions] of Object.entries(permissions)) {
      if (Array.isArray(servicePermissions)) {
        for (const permission of servicePermissions) {
          updates.push({
            agent_id: agentId,
            service_type: serviceType,
            permission_type: permission,
            permission_value: 'true'
          });
        }
      }
    }

    if (updates.length > 0) {
      const { error: insertError } = await supabase
        .from('agent_permissions')
        .insert(updates);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      message: 'Permissions updated successfully',
      agentId,
      permissions
    });
  } catch (error) {
    console.error('Error updating agent permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update agent permissions' },
      { status: 500 }
    );
  }
}
