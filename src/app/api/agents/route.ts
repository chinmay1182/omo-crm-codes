// Agent management API
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { supabase } from "@/app/lib/supabase"; // Updated to use Supabase
import { getSession, getSessionFromRequest } from "@/app/lib/session";

// GET - List all agents
export async function GET(req: NextRequest) {
  try {
    // Check for agent_session cookie
    const agentSession = req.cookies.get('agent_session');
    if (!agentSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let currentAgent;
    try {
      const sessionData = JSON.parse(agentSession.value);
      currentAgent = sessionData.user || sessionData;
    } catch (e) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const includePermissions = url.searchParams.get("includePermissions") === "true";

    // If requesting permissions for a specific agent
    if (agentId && includePermissions) {
      // Fetch permissions for a specific agent from Supabase
      const { data: permissions, error } = await supabase
        .from('agent_permissions')
        .select('service_type, permission_type')
        .eq('agent_id', agentId);

      if (error) throw error;

      const structuredPermissions: { [key: string]: string[] } = {
        whatsapp: [],
        voip: [],
        contacts: [],
        services: [],
        tasks: [],
        notes: [],
        tickets: [],
        leads: [],
        forms: [],
        scheduling: [],
        meetings: [],
      };

      for (const perm of permissions || []) {
        if (
          perm.service_type &&
          perm.permission_type &&
          structuredPermissions[perm.service_type]
        ) {
          structuredPermissions[perm.service_type].push(perm.permission_type);
        }
      }

      return NextResponse.json(structuredPermissions);
    }

    // Original code for fetching all agents with optional permissions
    // Fetch agents with roles and creator info
    // Assuming relations are: agents(created_by) -> users, agent_roles(agent_id, role_id) -> roles
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        users!agents_created_by_fkey(email),
        agent_roles(
          roles(name)
        ),
        agent_permissions(service_type, permission_type),
        agent_cli_assignments(cli_id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process the results to include permissions in a structured format
    const agentsWithPermissions = agents.map((agent: any) => {
      // Extract roles from nested relation
      const roles = agent.agent_roles?.map((ar: any) => ar.roles?.name).filter(Boolean) || [];

      // Extract assigned CLIs
      const assigned_clis = agent.agent_cli_assignments?.map((aca: any) => aca.cli_id).filter(Boolean) || [];

      const result: any = {
        id: agent.id,
        username: agent.username,
        email: agent.email,
        full_name: agent.full_name,
        phone_number: agent.phone_number,
        status: agent.status,
        created_at: agent.created_at,
        last_login: agent.last_login,
        roles: roles.join(','),
        created_by_email: agent.users?.email,
        assigned_cli_ids: assigned_clis
      };

      if (includePermissions && agent.agent_permissions) {
        const permissions: { [key: string]: string[] } = {
          whatsapp: [],
          voip: [],
          contacts: [],
          services: [],
          tasks: [],
          notes: [],
          tickets: [],
          leads: [],
          forms: [],
          scheduling: [],
          meetings: [],
        };

        for (const perm of agent.agent_permissions) {
          if (perm.service_type && perm.permission_type && permissions[perm.service_type]) {
            permissions[perm.service_type].push(perm.permission_type);
          }
        }
        result.permissions = permissions;
      }

      return result;
    });

    return NextResponse.json({ agents: agentsWithPermissions });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST - Create new agent
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, email, full_name, phone_number, roles, permissions, assigned_cli_ids } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Generate random password
    const password =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if username already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('username', username)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Create agent - handle created_by FK constraint
    // If an Agent creates another Agent, we cannot link to 'users' table, so we set created_by to NULL.
    let createdBy: number | null = null;

    // Only attempt to use session ID if the session is explicitly a 'user' type (not agent)
    // and the ID is valid. 
    if (session.user?.type !== 'agent') {
      try {
        const userId = parseInt(String(session.user.id));
        if (!isNaN(userId) && userId > 0) {
          createdBy = userId;
        }
      } catch (e) {
      }
    } else {
    }

    // Insert Agent
    const { data: newAgent, error: insertError } = await supabase
      .from('agents')
      .insert([{
        username,
        password: hashedPassword,
        email: email || null,
        full_name: full_name || null,
        phone_number: phone_number || null,
        profile_image: '/profile-icons/Sample.svg', // Set default profile picture
        created_by: createdBy
      }])
      .select('id')
      .single();

    if (insertError) throw insertError;

    const agentId = newAgent.id;

    // Assign roles if provided
    if (roles && roles.length > 0) {
      const roleInserts = roles.map((roleId: any) => ({
        agent_id: agentId,
        role_id: roleId,
        assigned_by: createdBy
      }));
      const { error: roleError } = await supabase.from('agent_roles').insert(roleInserts);
      if (roleError) console.error('Error assigning roles:', roleError);
    }

    // Assign individual permissions if provided
    if (permissions) {
      const permissionInserts: any[] = [];
      for (const [serviceType, perms] of Object.entries(permissions)) {
        if (Array.isArray(perms)) {
          for (const perm of perms) {
            permissionInserts.push({
              agent_id: agentId,
              service_type: serviceType,
              permission_type: perm,
              granted_by: createdBy
            });
          }
        }
      }
      if (permissionInserts.length > 0) {
        const { error: permError } = await supabase.from('agent_permissions').insert(permissionInserts);
        if (permError) console.error('Error assigning permissions:', permError);
      }
    }

    // Assign CLIs if provided
    if (assigned_cli_ids && assigned_cli_ids.length > 0) {
      const cliInserts = assigned_cli_ids.map((cliId: string) => ({
        agent_id: agentId,
        cli_id: cliId,
        assigned_by: createdBy
      }));
      const { error: cliError } = await supabase.from('agent_cli_assignments').insert(cliInserts);
      if (cliError) console.error('Error assigning CLIs:', cliError);
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        username,
        email,
        full_name,
        password, // Return password only on creation
      },
      message: "Agent created successfully",
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

// PUT - Update agent
export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, email, full_name, phone_number, status, roles, permissions, assigned_cli_ids } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Update agent basic info
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        email,
        full_name,
        phone_number,
        status
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Get the same createdBy logic for updates
    // If an Agent updates another Agent, we cannot link to 'users' table, so we set assigned_by to NULL.
    let assignedBy: number | null = null;

    if (session.user?.type !== 'agent') {
      try {
        const userId = parseInt(String(session.user.id));
        if (!isNaN(userId) && userId > 0) {
          assignedBy = userId;
        }
      } catch (e) {
      }
    } else {
    }

    // Update roles if provided
    if (roles !== undefined) {
      // Remove existing roles
      await supabase.from('agent_roles').delete().eq('agent_id', id);

      // Add new roles
      if (roles.length > 0) {
        const roleInserts = roles.map((roleId: any) => ({
          agent_id: id,
          role_id: roleId,
          assigned_by: assignedBy
        }));
        await supabase.from('agent_roles').insert(roleInserts);
      }
    }

    // Update permissions if provided
    if (permissions !== undefined) {
      // Remove existing permissions
      await supabase.from('agent_permissions').delete().eq('agent_id', id);

      // Add new permissions
      const permissionInserts: any[] = [];
      for (const [serviceType, perms] of Object.entries(permissions)) {
        if (Array.isArray(perms)) {
          for (const perm of perms) {
            permissionInserts.push({
              agent_id: id,
              service_type: serviceType,
              permission_type: perm,
              granted_by: assignedBy
            });
          }
        }
      }
      if (permissionInserts.length > 0) {
        await supabase.from('agent_permissions').insert(permissionInserts);
      }
    }

    // Update CLIs if provided
    if (assigned_cli_ids !== undefined) {
      // Remove existing assignments
      await supabase.from('agent_cli_assignments').delete().eq('agent_id', id);

      // Add new assignments
      if (assigned_cli_ids.length > 0) {
        const cliInserts = assigned_cli_ids.map((cliId: string) => ({
          agent_id: id,
          cli_id: cliId,
          assigned_by: assignedBy
        }));
        await supabase.from('agent_cli_assignments').insert(cliInserts);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Agent updated successfully",
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// DELETE - Delete/Suspend agent
export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("id");
    const action = searchParams.get("action") || "suspend"; // suspend or delete

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    if (action === "delete") {
      // Hard delete (remove from database)
      await supabase.from('agents').delete().eq('id', agentId);
    } else {
      // Soft delete (suspend)
      await supabase.from('agents').update({ status: 'suspended' }).eq('id', agentId);
    }

    return NextResponse.json({
      success: true,
      message: `Agent ${action === "delete" ? "deleted" : "suspended"
        } successfully`,
    });
  } catch (error) {
    console.error("Error deleting/suspending agent:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
