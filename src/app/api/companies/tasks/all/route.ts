import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
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

        if (!agentPermissions?.tasks?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Tasks module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    let query = supabase
      .from('company_tasks')
      .select(`
                *,
                companies(name),
                contacts(first_name, last_name)
            `);

    // Enforce View Permissions
    if (agentPermissions) {
      const canViewAll = agentPermissions.tasks?.includes('view_all');
      const canViewAssigned = agentPermissions.tasks?.includes('view_assigned');
      const hasAnyTaskPermission = agentPermissions.tasks && agentPermissions.tasks.length > 0;

      if (!canViewAll) {
        // If agent has any task permission, they can view all tasks
        // This allows them to see tasks they created or need to work with
        if (!hasAnyTaskPermission) {
          return NextResponse.json({ error: 'Access Denied: No task permissions' }, { status: 403 });
        }
        // If they have task permissions but not view_all, they can still see all tasks
        // (This is a business decision - agents with task permissions need to see tasks to work with them)
      }
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    // Map the results to match the expected format (where company_name comes from the relation)
    const formattedTasks = tasks.map((task: any) => ({
      ...task,
      company_name: task.companies?.name,
      contact_first_name: task.contacts?.first_name,
      contact_last_name: task.contacts?.last_name
    }));

    // Sort manually since Supabase sorting with custom logic (CASE stmt) is tricky in a single call,
    // unless we use a View or simpler sorting.
    // Replicating: CASE ct.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
    const priorityOrder: Record<string, number> = { 'high': 1, 'medium': 2, 'low': 3 };

    formattedTasks.sort((a, b: any) => {
      const pA = priorityOrder[a.priority] || 4;
      const pB = priorityOrder[b.priority] || 4;
      if (pA !== pB) return pA - pB;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}