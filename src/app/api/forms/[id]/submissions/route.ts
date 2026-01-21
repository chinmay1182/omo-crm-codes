import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as publicSupabase } from '@/app/lib/supabase';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        // Use Service Role if available to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co'
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';


        const supabase = (supabaseUrl && supabaseServiceKey)
            ? createClient(supabaseUrl, supabaseServiceKey)
            : publicSupabase;

        // 1. Store submission
        const submissionData = {
            form_id: id,
            content: body, // Pass object directly, Supabase handles JSON mapping
            // contact_id: body.contact_id || null, // Removed as column does not exist in DB
        };

        const { error: submissionError } = await supabase
            .from('form_submissions')
            .insert([submissionData]);

        if (submissionError) {
            console.error('Supabase Submission Error:', submissionError);
            throw new Error(submissionError.message);
        }

        // 2. Increment submission count on form (Safely)
        try {
            await supabase.rpc('increment_submissions', { row_id: id });
        } catch (e) {
            console.warn('RPC increment failed (non-critical):', e);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Submission Route Error:', error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { data, error } = await publicSupabase
            .from('form_submissions')
            .select('*')
            .eq('form_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
