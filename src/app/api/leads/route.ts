import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { supabaseAdmin, hasAdminClient } from '@/app/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// Helper function to create notifications
async function createNotification(title: string, message: string, type: string, relatedId?: string, relatedType?: string) {
  try {
    await supabase.from('notifications').insert([
      { title, message, type, related_id: relatedId || null, related_type: relatedType || null }
    ]);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Use admin client if available to bypass RLS
    const client = hasAdminClient() ? supabaseAdmin! : supabase;

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session'); // Assuming this cookie stores agent data
    let agentId: string | null = null;
    let agentPermissions: any = null;



    if (agentSession) {
      try {
        let sessionStr = agentSession.value;
        if (sessionStr.includes('%')) {
          sessionStr = decodeURIComponent(sessionStr);
        }
        const sessionData = JSON.parse(sessionStr);
        const agent = sessionData.user || sessionData;
        agentId = agent.id;
        agentPermissions = agent.permissions;


        // 1. Module Access
        if (!agentPermissions?.leads?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    } else {
    }

    // Start building query
    let query = client
      .from('leads')
      .select(`
        *,
        contacts(*),
        companies(*),
        agents(id, username, full_name),
        lead_comments(*)
      `)
      .order('created_at', { ascending: false });

    // 2. View Permissions (Enforce Filter)
    if (agentPermissions) {
      const canViewAll = agentPermissions.leads?.includes('view_all');
      const canViewAssigned = agentPermissions.leads?.includes('view_assigned');


      if (!canViewAll) {
        if (canViewAssigned && agentId) {
          query = query.eq('assigned_to', agentId);
        } else {
          return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
      }
    }

    // Fetch leads
    const { data: leads, error } = await query;

    if (error) {
      console.error('Supabase error fetching leads:', error);
      throw error;
    }

    // Format the leads data to include structured contact_data and company_data
    // Supabase returns nested objects for relations, so we map them to the structure expected by the frontend
    const formattedLeads = leads.map((lead: any) => ({
      id: lead.id,
      reference_id: lead.reference_id || lead.lead_reference_id || null,
      assignment_name: lead.assignment_name,
      contact_id: lead.contact_id,
      contact_name: lead.contacts ? `${lead.contacts.first_name || ''} ${lead.contacts.last_name || ''}`.trim() : null,
      contact_data: lead.contacts ? {
        ...lead.contacts,
        company_name: lead.companies?.name // Legacy expectation
      } : undefined,
      company_id: lead.company_id,
      company_name: lead.companies?.name,
      company_data: lead.companies ? {
        ...lead.companies,
        name: lead.companies.name // ensuring name is accessible
      } : undefined,
      stage: lead.stage,
      service: lead.service,
      amount: lead.amount,
      closing_date: lead.closing_date,
      source: lead.source,
      priority: lead.priority,
      assigned_to: lead.assigned_to,
      assigned_agent_name: lead.agents?.full_name,
      assigned_agent_username: lead.agents?.username,
      description: lead.description,
      comments: lead.lead_comments || [],
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }));

    return NextResponse.json(formattedLeads);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (agentSession) {
      try {
        let sessionStr = agentSession.value;
        if (sessionStr.includes('%')) {
          sessionStr = decodeURIComponent(sessionStr);
        }
        const sessionData = JSON.parse(sessionStr);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.leads?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
        }
        // Using 'edit' as proxy for create if 'create' is not explicitly separated/available in the schema provided previously.
        // Requirement said "hide 'Add New Lead' ... based on leads.edit (acting as proxy)".
        if (!permissions?.leads?.includes('edit')) { // Checking edit permission for creation
          return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    const requiredFields = ['assignment_name', 'stage'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const leadId = uuidv4();

    // Use admin client if available to bypass RLS
    const client = hasAdminClient() ? supabaseAdmin! : supabase;

    const { data: leadData, error: insertError } = await client
      .from('leads')
      .insert([
        {
          id: leadId,
          assignment_name: body.assignment_name,
          contact_id: body.contact_id || null,
          company_id: body.company_id || null,
          stage: body.stage,
          service: body.service || null,
          amount: body.amount || null,
          closing_date: body.closing_date || null,
          source: body.source || null,
          priority: body.priority || 'Medium',
          assigned_to: body.assigned_to || null,
          description: body.description || null
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch the full lead data with relations to return to frontend
    const { data: newLead, error: fetchError } = await client
      .from('leads')
      .select(`
        *,
        contacts(*),
        companies(*),
        agents(id, username, full_name)
      `)
      .eq('id', leadId)
      .single();

    if (fetchError) throw fetchError;

    const formattedLead = {
      id: newLead.id,
      assignment_name: newLead.assignment_name,
      contact_id: newLead.contact_id,
      contact_name: newLead.contacts ? `${newLead.contacts.first_name || ''} ${newLead.contacts.last_name || ''}`.trim() : null,
      contact_data: newLead.contacts ? {
        ...newLead.contacts,
        company_name: newLead.companies?.name
      } : undefined,
      company_id: newLead.company_id,
      company_name: newLead.companies?.name,
      company_data: newLead.companies ? {
        ...newLead.companies
      } : undefined,
      stage: newLead.stage,
      service: newLead.service,
      amount: newLead.amount,
      closing_date: newLead.closing_date,
      source: newLead.source,
      priority: newLead.priority,
      assigned_to: newLead.assigned_to,
      assigned_agent_name: newLead.agents?.full_name,
      assigned_agent_username: newLead.agents?.username,
      description: newLead.description,
      created_at: newLead.created_at,
      updated_at: newLead.updated_at
    };

    // Create notification if lead is assigned to an agent
    if (body.assigned_to) {
      try {
        const { data: agent } = await supabase
          .from('agents')
          .select('full_name, username')
          .eq('id', body.assigned_to)
          .single();

        if (agent) {
          await createNotification(
            'New Lead Assigned',
            `Lead "${body.assignment_name}" has been assigned to ${agent.full_name || agent.username}`,
            'lead_assigned',
            leadId,
            'lead'
          );
        }
      } catch (error) {
        console.error('Error creating assignment notification:', error);
      }
    }

    return NextResponse.json(formattedLead, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead' },
      { status: 500 }
    );
  }
}
