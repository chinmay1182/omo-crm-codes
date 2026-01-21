import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { addDays, addWeeks, addMonths, addYears, parseISO, isAfter, isValid } from 'date-fns';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const {
      companyId,
      title,
      description,
      due_date,
      status,
      is_recurring,
      recurrence_pattern,
      recurring_until,
      related_to,
      priority,
      mark_as_completed,
      mark_as_high_priority,
      total_amount,
      assigned_to
    } = await request.json();

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.tasks?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Tasks module disabled' }, { status: 403 });
        }
        if (!permissions?.tasks?.includes('create')) {
          return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Data Packing into Description
    // Because columns like total_amount, related_to, mark_as_high_priority are missing in DB
    let finalDescription = description || '';

    if (total_amount) {
      finalDescription += `\n\n[Amount: ${total_amount}]`;
    }
    if (related_to) {
      finalDescription += `\n\n[Related: ${related_to}]`;
    }
    if (mark_as_high_priority) {
      finalDescription += `\n\n[Critical]`;
    }

    // Generate tasks list (single or multiple if recurring)
    const tasksToInsert = [];
    const baseTask = {
      company_id: companyId || null,
      title,
      description: finalDescription.trim(),
      status: (mark_as_completed ? 'completed' : (['pending', 'in_progress', 'completed', 'hold', 'drop'].includes(status) ? status : 'pending')),
      priority: (mark_as_high_priority ? 'high' : priority) || 'medium',
      assigned_to: assigned_to || null,
      is_recurring: is_recurring || false,
      recurrence_pattern: recurrence_pattern || null,
      recurring_until: recurring_until || null
    };


    if (is_recurring && due_date && recurring_until) {
      const startDate = parseISO(due_date);
      const endDate = parseISO(recurring_until);

      if (!isValid(startDate) || !isValid(endDate)) {
        console.error('Invalid dates provided');
        tasksToInsert.push({ ...baseTask, due_date: due_date || null });
      } else {

        let currentDate = startDate;
        let safetyCounter = 0;
        const MAX_INSTANCES = 365;
        const normalizedPattern = (recurrence_pattern || '').toLowerCase(); // Ensure lowercase

        // Loop while currentDate is NOT after endDate
        while (!isAfter(currentDate, endDate) && safetyCounter < MAX_INSTANCES) {
          tasksToInsert.push({
            ...baseTask,
            due_date: currentDate.toISOString()
          });

          // Increment logic using date-fns
          switch (normalizedPattern) {
            case 'daily':
              currentDate = addDays(currentDate, 1);
              break;
            case 'weekly':
              currentDate = addWeeks(currentDate, 1);
              break;
            case 'monthly':
              currentDate = addMonths(currentDate, 1);
              break;
            case 'yearly':
              currentDate = addYears(currentDate, 1);
              break;
            default:
              console.warn(`Unknown recurrence pattern: ${recurrence_pattern}. Defaulting to single task loop exit.`);
              currentDate = addYears(currentDate, 100);
              break;
          }
          safetyCounter++;
        }
      }
    } else {
      // Single task
      tasksToInsert.push({
        ...baseTask,
        due_date: due_date || null
      });
    }

    if (tasksToInsert.length === 0) {
      return NextResponse.json(
        { message: 'No tasks generated based on the provided dates', taskIds: [] },
        { status: 200 }
      );
    }

    // Insert tasks
    if (is_recurring && due_date && recurring_until && tasksToInsert.length > 1) {
      // For recurring tasks, insert the first task (parent) first
      const parentTask = tasksToInsert[0];
      const { data: parentData, error: parentError } = await supabase
        .from('company_tasks')
        .insert([{ ...parentTask, instance_number: 1 }])
        .select('id')
        .single();

      if (parentError) throw parentError;

      const parentId = parentData.id;

      // Insert remaining tasks with parent reference
      const childTasks = tasksToInsert.slice(1).map((task, index) => ({
        ...task,
        parent_task_id: parentId,
        instance_number: index + 2 // Start from 2 since parent is 1
      }));

      const { data: childData, error: childError } = await supabase
        .from('company_tasks')
        .insert(childTasks)
        .select('id');

      if (childError) throw childError;

      const allTaskIds = [parentData, ...(childData || [])].map((t: any) => t.id);

      return NextResponse.json(
        {
          message: `Successfully created ${tasksToInsert.length} recurring task(s) - ${recurrence_pattern} from ${new Date(due_date).toLocaleDateString()} to ${new Date(recurring_until).toLocaleDateString()}`,
          taskIds: allTaskIds,
          parentTaskId: parentId,
          totalInstances: tasksToInsert.length
        },
        { status: 201 }
      );
    } else {
      // Single task or non-recurring
      const { data: newTasks, error } = await supabase
        .from('company_tasks')
        .insert(tasksToInsert)
        .select('id');

      if (error) throw error;

      return NextResponse.json(
        {
          message: `Successfully created ${tasksToInsert.length} task(s)`,
          taskIds: newTasks.map((t: any) => t.id)
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
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

        if (!agentPermissions?.tasks?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Tasks module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    let query = supabase
      .from('company_tasks')
      .select('*')
      .eq('company_id', companyId);

    // Enforce View Permissions
    if (agentPermissions) {
      const canViewAll = agentPermissions.tasks?.includes('view_all');
      const canViewAssigned = agentPermissions.tasks?.includes('view_assigned');

      if (!canViewAll) {
        if (canViewAssigned && agentId) {
          query = query.eq('assigned_to', agentId);
        } else {
          return NextResponse.json({ error: 'Access Denied: No view permission' }, { status: 403 });
        }
      }
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    // Sort manually to match MySQL custom priority sorting: High (1), Medium (2), Low (3), then date
    const priorityWeight: Record<string, number> = { high: 1, medium: 2, low: 3 };
    const sortedTasks = (tasks || []).sort((a, b) => {
      const pA = priorityWeight[a.priority?.toLowerCase()] || 4;
      const pB = priorityWeight[b.priority?.toLowerCase()] || 4;
      if (pA !== pB) return pA - pB;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return NextResponse.json(sortedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const body = await request.json();
    const {
      status,
      mark_as,
      priority,
      is_recurring,
      recurrence_pattern
    } = body;

    // Note: body contains only fields to update usually, but code destructures them. 
    // We should build update object dynamically or use COALESCE-like behavior if undefined?
    // Supabase update only updates specified fields.
    const updates: any = {};
    if (status !== undefined) {
      if (!['pending', 'in_progress', 'completed', 'hold', 'drop'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updates.status = status;
    }
    if (mark_as !== undefined) updates.mark_as = mark_as;
    if (priority !== undefined) updates.priority = priority;
    if (is_recurring !== undefined) updates.is_recurring = is_recurring;
    if (recurrence_pattern !== undefined) updates.recurrence_pattern = recurrence_pattern;

    const { error } = await supabase
      .from('company_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Task updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    const { error } = await supabase
      .from('company_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}