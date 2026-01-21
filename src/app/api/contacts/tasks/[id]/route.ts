import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      title,
      description,
      due_date,
      status,
      priority,
      is_recurring,
      recurrence_pattern,
      recurring_until,
      mark_as_completed,
      mark_as_high_priority,
      total_amount
    } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (due_date !== undefined) updates.due_date = due_date;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    // Additional fields
    if (is_recurring !== undefined) updates.is_recurring = is_recurring;
    if (recurrence_pattern !== undefined) updates.recurrence_pattern = recurrence_pattern;
    if (recurring_until !== undefined) updates.recurring_until = recurring_until;
    if (mark_as_completed !== undefined) updates.mark_as_completed = mark_as_completed;
    if (mark_as_high_priority !== undefined) updates.mark_as_high_priority = mark_as_high_priority;
    if (total_amount !== undefined) updates.total_amount = total_amount;

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('contact_tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating contact task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { error } = await supabase
      .from('contact_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}