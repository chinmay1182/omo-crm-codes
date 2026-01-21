import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { companyId, title, content } = await request.json();

    // Check Agent Permissions and Get ID
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let createdBy = 'system'; // Default fallback
    let agentPermissions: any = null;

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        agentPermissions = agent.permissions;

        if (agentPermissions?.notes?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Notes module disabled' }, { status: 403 });
        }
        if (!agentPermissions?.notes?.create) {
          return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
        }
        if (agent.id) createdBy = String(agent.id); // Ensure string if column is string, or keep as is if mixed.
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    if (!companyId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('company_notes')
      .insert([
        {
          company_id: companyId,
          title,
          content,
          created_by: createdBy
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: 'Note created successfully', noteId: data.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let agentId: string | null = null;
    let agentPermissions: any = null;

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        agentId = agent.id;
        agentPermissions = agent.permissions;

        if (agentPermissions?.notes?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Notes module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    let query = supabase
      .from('company_notes')
      .select('id, title, content, created_by, created_at, updated_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    // Enforce View Permissions
    if (agentPermissions) {
      const canViewAll = agentPermissions.notes?.includes('view_all');
      const canViewAssigned = agentPermissions.notes?.includes('view_assigned');

      if (!canViewAll) {
        if (canViewAssigned && agentId) {
          query = query.eq('created_by', agentId);
        } else {
          return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
      }
    }

    const { data: notes, error } = await query;

    if (error) throw error;

    return NextResponse.json(notes || []);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}