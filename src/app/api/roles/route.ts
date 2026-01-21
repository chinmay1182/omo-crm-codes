// Roles management API
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

// Helper to validate admin session
async function validateAdminSession() {
  const cookieStore = await cookies();
  const agentSession = cookieStore.get('agent_session');

  if (!agentSession) {
    return { error: 'Unauthorized', status: 401 };
  }

  try {
    const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
    const permissions = agent.permissions;

    if (!permissions?.admin?.includes('system_config') && !permissions?.admin?.includes('manage_agents')) {
      return { error: 'Access Denied: Requires System Config or Manage Agents permission', status: 403 };
    }
    return { success: true };
  } catch (e) {
    return { error: 'Invalid session', status: 401 };
  }
}

// GET - List all roles
export async function GET() {
  try {
    // Only authenticated agents can list roles (even for assignment)
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    if (!agentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name, description, permissions, created_at')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST - Create new role
export async function POST(req: NextRequest) {
  try {
    const validation = await validateAdminSession();
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { name, description, permissions } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    // Create role
    const { data: newRole, error: insertError } = await supabase
      .from('roles')
      .insert([{
        name,
        description,
        permissions: permissions // Supabase handles JSON/JSONB
      }])
      .select()
      .single();

    if (insertError) {
      // Handle unique violation if race condition
      if (insertError.code === '23505') return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      role: newRole,
      message: 'Role created successfully'
    });

  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

// PUT - Update role
export async function PUT(req: NextRequest) {
  try {
    const validation = await validateAdminSession();
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { id, name, description, permissions } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Role ID and name are required' }, { status: 400 });
    }

    // Update role
    const { error: updateError } = await supabase
      .from('roles')
      .update({ name, description, permissions })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully'
    });

  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE - Delete role
export async function DELETE(req: NextRequest) {
  try {
    const validation = await validateAdminSession();
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Check if role is assigned to any agents
    const { count, error: countError } = await supabase
      .from('agent_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    if (countError) throw countError;

    if (count && count > 0) {
      return NextResponse.json({
        error: 'Cannot delete role that is assigned to agents'
      }, { status: 400 });
    }

    // Delete role
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}