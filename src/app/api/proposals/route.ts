import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function GET() {
  try {
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

        if (!agentPermissions?.leads?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    let query = supabase
      .from('proposals')
      .select(`
        *,
        leads!left (
          assignment_name,
          assigned_to,
          contacts!left (
            first_name,
            last_name
          ),
          companies!left (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Enforce View Permissions
    if (agentPermissions) {
      const canViewAll = agentPermissions.leads?.includes('view_all');
      const canViewAssigned = agentPermissions.leads?.includes('view_assigned');

      if (!canViewAll) {
        if (canViewAssigned && agentId) {
          // To filter by a relation column, we typically need strict filtering logic.
          // Switching to !inner join would filter out any proposals where the lead doesn't match the condition.
          // However, the original query used !left.
          // If we want to filter the PROPOSALS list based on the LEAD'S assignment, we must ensure logical consistency.
          // If a proposal has NO lead (unlikely in this schema), it would be hidden by !inner.
          // Given the requirement to only see assigned, hiding unassigned/orphaned is correct security behavior.
          query = supabase
            .from('proposals')
            .select(`
                    *,
                    leads!inner (
                      assignment_name,
                      assigned_to,
                      contacts!left (
                        first_name,
                        last_name
                      ),
                      companies!left (
                        name
                      )
                    )
                  `)
            .eq('leads.assigned_to', agentId)
            .order('created_at', { ascending: false });
        } else {
          return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
      }
    }

    // Fetch proposals with related data
    const { data: proposals, error } = await query;

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') return NextResponse.json([]);
      throw error;
    }

    // Process proposals to flatten structure and handle expiry
    const now = new Date();
    const processedProposals = await Promise.all(proposals.map(async (proposal: any) => {
      // Expiry Logic: Only expire if date passed AND status is not finalized (accepted/partial/drop)
      if (new Date(proposal.expiry_date) < now &&
        proposal.proposal_status !== 'expired' &&
        proposal.proposal_status !== 'accepted' &&
        proposal.proposal_status !== 'partial' &&
        proposal.proposal_status !== 'drop'
      ) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ proposal_status: 'expired' })
          .eq('id', proposal.id);

        if (!updateError) proposal.proposal_status = 'expired';
      }

      // Flatten embedded data
      return {
        ...proposal,
        lead_assignment_name: proposal.leads?.assignment_name,
        contact_name: proposal.leads?.contacts ? `${proposal.leads.contacts.first_name || ''} ${proposal.leads.contacts.last_name || ''}`.trim() : '',
        company_name: proposal.leads?.companies?.name
      };
    }));

    return NextResponse.json(processedProposals);
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
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
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.leads?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Leads module disabled' }, { status: 403 });
        }
        if (!permissions?.leads?.includes('proposal_create')) {
          return NextResponse.json({ error: 'Access Denied: No proposal create permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    const requiredFields = ['lead_id', 'proposal_to'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const proposalId = uuidv4();
    const proposalNumber = `PROP-${Date.now().toString().slice(-8)}`;
    const validityDays = body.validity_days ? parseInt(body.validity_days) : 7;

    // Use Asia/Kolkata Timezone for Dates
    const proposalDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const expiryCalcDate = new Date();
    expiryCalcDate.setDate(expiryCalcDate.getDate() + validityDays);
    const expiryDate = expiryCalcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Get lead details
    const { data: leadData } = await supabase
      .from('leads')
      .select('id, assignment_name')
      .eq('id', body.lead_id)
      .single();

    if (!leadData) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const { error: insertError } = await supabase
      .from('proposals')
      .insert([{
        id: proposalId,
        proposal_number: proposalNumber,
        lead_id: body.lead_id, // Ensuring generic type compatibility
        lead_reference_number: String(leadData.id).substring(0, 8),
        proposal_to: body.proposal_to,
        proposal_date: proposalDate,
        proposal_status: body.proposal_status || 'hold',
        amount: body.amount === '' ? null : body.amount,
        discount: body.discount === '' ? 0 : body.discount,
        expiry_date: expiryDate,
        description: body.description || null
      }]);

    if (insertError) throw insertError;

    // Fetch returned data with relations
    const { data: newProposal, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        *,
        leads!left (
            assignment_name,
            contacts!left (
                first_name,
                last_name
            ),
            companies!left (
                name
            )
        )
      `)
      .eq('id', proposalId)
      .single();

    if (fetchError) throw fetchError;

    // Flatten result for client stability
    const flattenedNewProposal = {
      ...newProposal,
      lead_assignment_name: newProposal.leads?.assignment_name,
      contact_name: newProposal.leads?.contacts ? `${newProposal.leads.contacts.first_name || ''} ${newProposal.leads.contacts.last_name || ''}`.trim() : '',
      company_name: newProposal.leads?.companies?.name
    };

    return NextResponse.json(flattenedNewProposal, { status: 201 });
  } catch (error: any) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create proposal' },
      { status: 500 }
    );
  }
}