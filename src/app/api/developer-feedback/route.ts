import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Map frontend 'type' to DB column 'feedback_type'
        const { type, ...rest } = body;
        const payload = {
            ...rest,
            feedback_type: type
        };

        const { error } = await supabase
            .from('developer_feedback')
            .insert([payload]);

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Server error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
