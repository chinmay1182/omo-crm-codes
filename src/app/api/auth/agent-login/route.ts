// Agent login API
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // Using bcryptjs to match other files, though original had bcrypt
import { supabase } from '@/app/lib/supabase';
import { setRichSessionCookie } from '@/app/lib/session';
import { SignJWT } from 'jose';
import { PERMISSION_LEVELS, AgentPermissions } from '@/app/lib/roleDefaults';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();


    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get agent from database
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('username', username)
      .eq('status', 'active')
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Invalid username or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, agent.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Get roles for this agent
    const { data: agentRolesData, error: rolesError } = await supabase
      .from('agent_roles')
      .select('roles(*)')
      .eq('agent_id', agent.id);

    // Process roles and permissions
    let roleNames: string[] = [];
    let combinedPermissions: any = {
      whatsapp: [],
      voip: [],
      admin: []
    };

    if (agentRolesData) {
      agentRolesData.forEach((ar: any) => {
        const role = ar.roles;
        if (role) {
          roleNames.push(role.name);
          const permObj = role.permissions; // Supabase returns already parsed JSON column

          if (permObj) {
            Object.keys(permObj).forEach(key => {
              if (!combinedPermissions[key]) {
                combinedPermissions[key] = [];
              }
              if (Array.isArray(permObj[key])) {
                combinedPermissions[key] = [...new Set([...combinedPermissions[key], ...permObj[key]])];
              }
            });
          }

          // Merge Code Defaults (ensure new modules/permissions are present even if DB is stale)
          const defaultPerms = PERMISSION_LEVELS[role.name.toLowerCase()];
          if (defaultPerms) {
            Object.keys(defaultPerms).forEach(key => {
              if (!combinedPermissions[key]) combinedPermissions[key] = [];
              // Use type assertion or check if key exists in defaultPerms
              const perms = (defaultPerms as any)[key] || [];
              if (Array.isArray(perms)) {
                combinedPermissions[key] = [...new Set([...combinedPermissions[key], ...perms])];
              }
            });
          }
        }
      });
    }

    // Get individual permissions
    const { data: permissions } = await supabase
      .from('agent_permissions')
      .select('service_type, permission_type, permission_value')
      .eq('agent_id', agent.id);

    if (permissions) {
      permissions.forEach((perm: any) => {
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

    // Update last login
    await supabase
      .from('agents')
      .update({ last_login: new Date().toISOString() })
      .eq('id', agent.id);

    // Create user object for session
    const userData = {
      id: agent.id,
      username: agent.username,
      email: agent.email,
      full_name: agent.full_name,
      phone_number: agent.phone_number,
      profile_image: agent.profile_image, // Include profile image in session
      type: 'agent',
      roles: roleNames,
      permissions: combinedPermissions
    };

    // Create JWT token for agent dashboard
    console.log('Creating agent token for:', agent.username);
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

    console.log('Agent token created successfully');

    // Create response and set session cookie
    const response = NextResponse.json({
      user: userData,
      message: 'Agent login successful'
    });

    // Set session cookie for agent with full user details so client can render names
    setRichSessionCookie(response, userData);

    // Set agent token cookie for agent dashboard access
    response.cookies.set('agent-token', agentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Agent login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}