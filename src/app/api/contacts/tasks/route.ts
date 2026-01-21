import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const { data: tasks, error } = await supabase
      .from('company_tasks')
      .select('*')
      .eq('assigned_to', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching tasks:', error);
      throw error;
    }

    if (!tasks) {
      console.warn('No tasks found for contact:', contactId);
      return NextResponse.json([]);
    }

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Error fetching contact tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const {
      contactId,
      title,
      description,
      due_date,
      priority,
      status,
      total_amount,
      mark_as
    } = await req.json();

    if (!contactId || !title) {
      return NextResponse.json(
        { error: 'Contact ID and title are required' },
        { status: 400 }
      );
    }

    // PACKING LOGIC
    let finalDescription = description || '';
    if (total_amount) finalDescription += `\n\n[Amount: ${total_amount}]`;
    if (mark_as === 'hold' || mark_as === 'dropped') finalDescription += `\n\n[Status: ${mark_as}]`;

    // Status Logic: avoid 'hold' crash
    const safeStatus = (mark_as === 'completed')
      ? 'completed'
      : (['pending', 'in_progress', 'completed'].includes(status) ? status : 'pending');

    const { data: task, error: taskError } = await supabase
      .from('company_tasks')
      .insert({
        assigned_to: contactId,
        title,
        description: finalDescription.trim(),
        due_date: due_date || null,
        priority: priority || 'medium',
        status: safeStatus
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return NextResponse.json({
      success: true,
      id: task.id
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}