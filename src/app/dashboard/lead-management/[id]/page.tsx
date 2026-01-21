import LeadDetail from '@/app/components/LeadDetail/LeadDetail';
import { getLeadById } from '../../../actions/lead';

export default async function LeadPage({ params }: { params: { id: string } }) {
  const lead = await getLeadById(params.id);
  
  if (!lead) {
    return <div>Lead not found</div>;
  }

  return <LeadDetail lead={lead} />;
}