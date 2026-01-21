import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  // Check if user is an agent
  const session = await getSession();
  const isAgent = session?.user?.type === 'agent';

  // Redirect to appropriate default dashboard sub-route
  if (isAgent) {
    redirect('/dashboard/agent-info');
  } else {
    redirect('/dashboard/voip');
  }
}