import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

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

    // 1. Fetch Notes
    const { data: notes, error: notesError } = await supabase
      .from('company_notes')
      .select('*')
      .eq('company_id', companyId);

    // 2. Fetch Tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('company_tasks')
      .select('*')
      .eq('company_id', companyId);

    // 3. Fetch Emails
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .limit(50); // Limit to recent 50 emails

    // 4. Fetch WhatsApp Messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to recent 50 messages

    // 5. Fetch Meetings
    const { data: meetings, error: meetingsError } = await supabase
      .from('company_meetings')
      .select('*')
      .eq('company_id', companyId);

    // 6. Fetch Files
    const { data: files, error: filesError } = await supabase
      .from('company_files')
      .select('*')
      .eq('company_id', companyId);

    // 7. Normalize & Combine
    const activities = [
      ...(notes || []).map((n: any) => {
        const typeMatch = n.content?.match(/^\[(.*?)\]/);
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'note';
        const desc = typeMatch ? n.content.replace(/^\[.*?\]\s*/, '') : n.content;
        return {
          id: n.id,
          type: type === 'call' || type === 'email' || type === 'meeting' ? type : 'note',
          description: desc,
          created_at: n.created_at
        };
      }),
      ...(tasks || []).map((t: any) => ({
        id: t.id,
        type: 'task',
        description: `${t.title}${t.description ? ' - ' + t.description : ''}`,
        created_at: t.created_at
      })),
      ...(emails || []).map((e: any) => ({
        id: e.id,
        type: 'email',
        description: `${e.folder === 'sent' ? 'Sent' : 'Received'} email: ${e.subject || '(No subject)'}`,
        created_at: e.date || e.created_at
      })),
      ...(messages || []).map((m: any) => ({
        id: m.message_id,
        type: 'whatsapp',
        description: `${m.direction === 'OUT' ? 'Sent' : 'Received'} WhatsApp: ${m.content?.substring(0, 50) || 'Media message'}${m.content?.length > 50 ? '...' : ''}`,
        created_at: m.created_at
      })),
      ...(meetings || []).map((m: any) => ({
        id: m.id,
        type: 'meeting',
        description: `Meeting: ${m.title}`,
        created_at: m.created_at
      })),
      ...(files || []).map((f: any) => ({
        id: f.id,
        type: 'file',
        description: `Uploaded file: ${f.file_name}`,
        created_at: f.created_at
      }))
    ];

    // 8. Sort by Date Descending
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}