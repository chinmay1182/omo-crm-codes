'use server';

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for Server Actions (similar to route handlers)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4'

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getLeadById(id: string) {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        contacts(*),
        companies(*)
      `)
      .eq('id', id)
      .single();

    if (error || !lead) {
      console.error('Error fetching lead from Supabase:', error);
      return null;
    }

    // Format matches expected LeadForm initialData
    return {
      id: lead.id,
      assignment_name: lead.assignment_name,
      contact_id: lead.contact_id,
      contact_name: lead.contacts ? `${lead.contacts.first_name || ''} ${lead.contacts.last_name || ''}`.trim() : null,
      company_id: lead.company_id,
      company_name: lead.companies?.name,
      stage: lead.stage,
      service: lead.service,
      amount: lead.amount,
      closing_date: lead.closing_date,
      source: lead.source,
      priority: lead.priority,
      description: lead.description,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      // Add other fields if necessary
    };
  } catch (error) {
    console.error('Error fetching lead:', error);
    return null;
  }
}