import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;

    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(`
        *,
        leads (
          assignment_name,
          contact_id,
          company_id,
          contacts (first_name, last_name),
          companies (name)
        )
      `)
      .eq('id', proposalId)
      .single();

    if (error || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Format response to match original structure
    // Original had flatten properties
    const contactName = proposal.leads?.contacts
      ? `${proposal.leads.contacts.first_name || ''} ${proposal.leads.contacts.last_name || ''}`.trim()
      : '';

    const formattedProposal = {
      ...proposal,
      lead_assignment_name: proposal.leads?.assignment_name || null,
      contact_name: contactName,
      company_name: proposal.leads?.companies?.name || null
    };

    return NextResponse.json(formattedProposal);
  } catch (error: any) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const body = await request.json();

    const { data: currentProposal } = await supabase
      .from('proposals')
      .select('proposal_date')
      .eq('id', proposalId)
      .single();

    const updatePayload: any = {
      proposal_to: body.proposal_to,
      proposal_status: body.proposal_status,
      amount: body.amount || null,
      discount: body.discount || 0,
      description: body.description || null,
      updated_at: new Date().toISOString()
    };

    if (body.validity_days && currentProposal?.proposal_date) {
      const days = parseInt(body.validity_days);
      const proposalDate = new Date(currentProposal.proposal_date);
      const newExpiry = new Date(proposalDate);
      newExpiry.setDate(proposalDate.getDate() + days);
      updatePayload.expiry_date = newExpiry.toISOString().split('T')[0];
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update(updatePayload)
      .eq('id', proposalId);

    if (updateError) throw updateError;

    // Return updated proposal by calling GET logic or re-selecting
    // We can just call the Supabase select again.
    const { data: updatedProposal } = await supabase
      .from('proposals')
      .select(`
        *,
        leads (
          assignment_name,
          contact_id,
          company_id,
          contacts (first_name, last_name),
          companies (name)
        )
      `)
      .eq('id', proposalId)
      .single();

    if (!updatedProposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const contactName = updatedProposal.leads?.contacts
      ? `${updatedProposal.leads.contacts.first_name || ''} ${updatedProposal.leads.contacts.last_name || ''}`.trim()
      : '';

    const formattedUpdatedProposal = {
      ...updatedProposal,
      lead_assignment_name: updatedProposal.leads?.assignment_name || null,
      contact_name: contactName,
      company_name: updatedProposal.leads?.companies?.name || null
    };

    return NextResponse.json(formattedUpdatedProposal);
  } catch (error: any) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const body = await request.json();


    // For partial updates
    const updates: any = { updated_at: new Date().toISOString() };
    if (body.proposal_status !== undefined) {
      updates.proposal_status = body.proposal_status;
    }
    if (body.partial_amount !== undefined) {
      updates.partial_amount = body.partial_amount;
    }
    if (body.order_id !== undefined) {
      updates.order_id = body.order_id;
    }


    if (Object.keys(updates).length <= 1) {
      console.error('No fields to update besides updated_at');
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', proposalId);

    if (error) {
      console.error('Supabase Update Error:', JSON.stringify(error, null, 2));
      throw error;
    }


    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;

    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}