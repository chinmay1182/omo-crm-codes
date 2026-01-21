import LeadForm from '@/app/components/LeadForm/page';
import { getLeadById } from '../../../../actions/lead';

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const lead = await getLeadById(params.id);
  
  if (!lead) {
    return <div>Lead not found</div>;
  }

  return <LeadForm initialData={lead} />;
}