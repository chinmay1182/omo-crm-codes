import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { addDays, addWeeks, addMonths, addYears, parseISO, isAfter, isValid } from 'date-fns';
import { cookies } from 'next/headers';

export async function PUT(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;

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
        if (!permissions?.tasks?.includes('edit')) {
          return NextResponse.json({ error: 'Access Denied: No edit permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const {
      title,
      description,
      due_date,
      status,
      is_recurring,
      recurrence_pattern,
      recurring_until,
      priority,
      mark_as_completed,
      mark_as_high_priority,
      total_amount,
      companyId, // Capture companyId
      assigned_to // Capture assigned_to
    } = await request.json();

    if (status && !['pending', 'in_progress', 'completed', 'hold', 'drop'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (due_date !== undefined) updates.due_date = due_date;
    if (status !== undefined) updates.status = status;
    if (is_recurring !== undefined) updates.is_recurring = is_recurring;
    if (recurrence_pattern !== undefined) updates.recurrence_pattern = recurrence_pattern;
    if (recurring_until !== undefined) updates.recurring_until = recurring_until;

    if (priority !== undefined) updates.priority = priority;

    // Auto-set priority to high if mark_as_high_priority is true
    if (mark_as_high_priority === true) {
      updates.priority = 'high';
    }

    // Auto-set status to completed if mark_as_completed is true
    if (mark_as_completed === true) {
      updates.status = 'completed';
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('company_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;

    // --- Recurring Task Generation Logic (Edit Mode) ---
    // If the user enables recurring or updates dates, we generate FUTURE tasks.
    // We skip the first date because 'taskId' is already that first task.

    let generatedCount = 0;

    // First, check if this is a child task (part of existing series)
    // If it is, skip recurring generation to prevent duplicate series
    const { data: currentTask } = await supabase
      .from('company_tasks')
      .select('parent_task_id')
      .eq('id', taskId)
      .single();

    const isChildTask = currentTask?.parent_task_id !== null;

    // Only generate recurring tasks if this is NOT a child task
    if (!isChildTask && is_recurring && due_date && recurring_until && companyId) {
      // Delete any existing future recurring instances to prevent duplicates
      // This handles the case where user edits a recurring task multiple times
      const { error: deleteError } = await supabase
        .from('company_tasks')
        .delete()
        .eq('company_id', companyId)
        .eq('is_recurring', true)
        .neq('id', taskId) // Don't delete the current task being edited
        .gte('due_date', due_date); // Delete tasks with due_date >= current task's due_date

      if (deleteError) {
        console.error('Error deleting existing recurring tasks:', deleteError);
      } else {
      }
    }

    // Only proceed with generation if NOT a child task
    if (!isChildTask && is_recurring && due_date && recurring_until) {
      const startDate = parseISO(due_date);
      const endDate = parseISO(recurring_until);

      if (isValid(startDate) && isValid(endDate)) {
        const tasksToInsert = [];
        let currentDate = startDate;

        // Advance to NEXT interval immediately to avoid duplicating the current task
        const normalizedPattern = (recurrence_pattern || '').toLowerCase();
        switch (normalizedPattern) {
          case 'daily': currentDate = addDays(currentDate, 1); break;
          case 'weekly': currentDate = addWeeks(currentDate, 1); break;
          case 'monthly': currentDate = addMonths(currentDate, 1); break;
          case 'yearly': currentDate = addYears(currentDate, 1); break;
          default: currentDate = addYears(currentDate, 100); break;
        }

        let safetyCounter = 0;
        const MAX_INSTANCES = 365;

        // Base task for new inserts
        // We use values from 'updates' (which has latest) or body, fallback to existing isn't easy here without fetch.
        // We rely on body being complete or at least having what we need.
        // If companyId is missing in body (e.g. partial update), these tasks might be orphans?
        // Assume Frontend sends full object on edit (MainTaskModal does).

        const baseTask = {
          company_id: companyId || null, // Important: Ensure frontend sends this
          title: title || updates.title,
          description: description || updates.description,
          status: 'pending', // Future tasks start as pending usually? Or copy status? Let's use pending.
          priority: (updates.priority || priority) || 'medium',
          assigned_to: assigned_to || null,
          is_recurring: true,
          recurrence_pattern: recurrence_pattern || null,
          recurring_until: recurring_until || null
        };

        if (baseTask.company_id) { // Only generate if we have company context
          while (!isAfter(currentDate, endDate) && safetyCounter < MAX_INSTANCES) {
            tasksToInsert.push({
              ...baseTask,
              due_date: currentDate.toISOString()
            });

            switch (normalizedPattern) {
              case 'daily': currentDate = addDays(currentDate, 1); break;
              case 'weekly': currentDate = addWeeks(currentDate, 1); break;
              case 'monthly': currentDate = addMonths(currentDate, 1); break;
              case 'yearly': currentDate = addYears(currentDate, 1); break;
              default: currentDate = addYears(currentDate, 100); break; // Exit
            }
            safetyCounter++;
          }
        }

        if (tasksToInsert.length > 0) {
          // Add parent_task_id and instance_number to all child tasks
          const childTasks = tasksToInsert.map((task, index) => ({
            ...task,
            parent_task_id: taskId, // Current task becomes the parent
            instance_number: index + 2 // Start from 2 since current task is 1
          }));

          const { error: insertError } = await supabase
            .from('company_tasks')
            .insert(childTasks);

          if (!insertError) {
            generatedCount = childTasks.length;

            // Update the current task to set instance_number to 1
            await supabase
              .from('company_tasks')
              .update({ instance_number: 1 })
              .eq('id', taskId);
          } else {
            console.error('Error generating future tasks:', insertError);
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Task updated successfully. ${generatedCount > 0 ? `Created ${generatedCount} future recurring tasks.` : ''}`.trim()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;

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
        if (!permissions?.tasks?.includes('delete')) {
          return NextResponse.json({ error: 'Access Denied: No delete permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('company_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}