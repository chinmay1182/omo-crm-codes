export interface Lead {
  id: string;
  assignment_name: string;
  contact_id?: string;
  company_id?: string;
  stage: string;
  service?: string;
  amount?: number;
  closing_date?: string;
  source?: string;
  priority: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadWithRelations extends Lead {
  contact_name?: string;
  company_name?: string;
}