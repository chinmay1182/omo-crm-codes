import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Get agent details with roles
    // Join agents -> agent_roles -> roles
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        agent_roles (
          roles (
            name,
            permissions
          )
        )
      `)
      .eq('id', agentId)
      .eq('status', 'active')
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get agent individual permissions
    const { data: permissions, error: permError } = await supabase
      .from('agent_permissions')
      .select('service_type, permission_type, permission_value')
      .eq('agent_id', agentId);

    if (permError) throw permError;

    // Parse role permissions
    // Supabase returns nested objects structure
    // agent.agent_roles is array of objects { roles: { name, permissions } }

    let combinedPermissions: any = {
      whatsapp: [],
      voip: [],
      admin: []
    };

    // Extract role names and permissions
    const roleNames: string[] = [];

    if (agent.agent_roles && Array.isArray(agent.agent_roles)) {
      agent.agent_roles.forEach((ar: any) => {
        if (ar.roles) {
          if (ar.roles.name) roleNames.push(ar.roles.name);

          const rolePerms = ar.roles.permissions; // This is already JSON object in Supabase response
          if (rolePerms && typeof rolePerms === 'object') {
            Object.keys(rolePerms).forEach(key => {
              if (!combinedPermissions[key]) {
                combinedPermissions[key] = [];
              }
              if (Array.isArray(rolePerms[key])) {
                combinedPermissions[key] = [...new Set([...combinedPermissions[key], ...rolePerms[key]])];
              }
            });
          }
        }
      });
    }

    // Add individual permissions
    if (permissions && Array.isArray(permissions)) {
      permissions.forEach(perm => {
        if (perm && perm.service_type && perm.permission_type) {
          if (!combinedPermissions[perm.service_type]) {
            combinedPermissions[perm.service_type] = [];
          }
          // Avoid duplicates
          if (!combinedPermissions[perm.service_type].includes(perm.permission_type)) {
            combinedPermissions[perm.service_type].push(perm.permission_type);
          }
        }
      });
    }

    // Create user object for session
    const userData = {
      id: agent.id,
      username: agent.username,
      email: agent.email,
      full_name: agent.full_name,
      type: 'agent',
      roles: roleNames,
      permissions: combinedPermissions,
      profile_image: agent.profile_image
    };

    // Create new JWT token
    const agentToken = await new SignJWT({
      agentId: agent.id,
      username: agent.username,
      email: agent.email,
      fullName: agent.full_name,
      permissions: combinedPermissions,
      type: 'agent'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Create response and set session cookie
    const response = NextResponse.json({
      user: userData,
      message: 'Permissions refreshed successfully'
    });

    // Set session cookie for regular session (Legacy/Backup)
    response.cookies.set('session', JSON.stringify({ user: userData }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    // Set AGENT SESSION cookie (Accessible by JS, Critical for AuthContext)
    response.cookies.set('agent_session', JSON.stringify({ user: userData }), {
      httpOnly: false, // Allow JS access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    // Set agent token cookie for agent dashboard access
    response.cookies.set('agent-token', agentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Error refreshing agent permissions:', error);
    return NextResponse.json(
      { error: 'Failed to refresh permissions' },
      { status: 500 }
    );
  }
}
