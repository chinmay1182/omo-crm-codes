import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        // Prepare queries for different content types
        let tasksQuery = supabase
            .from('company_tasks')
            .select('id, title, created_at, company_id')
            .order('created_at', { ascending: false })
            .limit(20);

        let meetingsQuery = supabase
            .from('company_meetings')
            .select('id, title, created_at, company_id') // using created_at for "when it was scheduled"
            .order('created_at', { ascending: false })
            .limit(20);

        let notesQuery = supabase
            .from('company_notes')
            .select('id, title, created_at, company_id')
            .order('created_at', { ascending: false })
            .limit(20);

        let filesQuery = supabase
            .from('company_files')
            .select('id, file_name, created_at, company_id')
            .order('created_at', { ascending: false })
            .limit(20);

        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;

            tasksQuery = tasksQuery.gte('created_at', startOfDay).lte('created_at', endOfDay);
            meetingsQuery = meetingsQuery.gte('created_at', startOfDay).lte('created_at', endOfDay);
            notesQuery = notesQuery.gte('created_at', startOfDay).lte('created_at', endOfDay);
            filesQuery = filesQuery.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }

        const [tasksRes, meetingsRes, notesRes, filesRes] = await Promise.all([
            tasksQuery,
            meetingsQuery,
            notesQuery,
            filesQuery
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (meetingsRes.error) throw meetingsRes.error;
        if (notesRes.error) throw notesRes.error;
        if (filesRes.error) throw filesRes.error;

        const activities: any[] = [];

        tasksRes.data.forEach((item: any) => {
            activities.push({
                id: `task-${item.id}`,
                type: 'task_created',
                description: `Task created: ${item.title}`,
                created_at: item.created_at,
                company_id: item.company_id
                // original_id: item.id
            });
        });

        meetingsRes.data.forEach((item: any) => {
            activities.push({
                id: `meeting-${item.id}`,
                type: 'meeting_scheduled',
                description: `Meeting scheduled: ${item.title}`,
                created_at: item.created_at,
                company_id: item.company_id
            });
        });

        notesRes.data.forEach((item: any) => {
            activities.push({
                id: `note-${item.id}`,
                type: 'note_added',
                description: `Note added: ${item.title}`,
                created_at: item.created_at,
                company_id: item.company_id
            });
        });

        filesRes.data.forEach((item: any) => {
            activities.push({
                id: `file-${item.id}`,
                type: 'file_uploaded',
                description: `File uploaded: ${item.file_name}`,
                created_at: item.created_at,
                company_id: item.company_id
            });
        });

        // Sort combined activities by created_at desc
        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return NextResponse.json(activities);
    } catch (error) {
        console.error('Error fetching all activities:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activities' },
            { status: 500 }
        );
    }
}
