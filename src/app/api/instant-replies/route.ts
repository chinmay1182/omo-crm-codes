import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
    try {
        // Try to get from database first
        const { data: replies, error } = await supabase
            .from('instant_replies')
            .select('*')
            .order('category', { ascending: true })
            .order('title', { ascending: true });

        if (error) throw error;

        return NextResponse.json(replies);
    } catch (error) {

        const defaultReplies = [
            {
                id: '1',
                title: 'Welcome Message',
                message: 'Hello! Thank you for contacting us. How can I help you today?',
                category: 'Greeting'
            },
            {
                id: '2',
                title: 'Business Hours',
                message: 'Our business hours are Monday to Friday, 9 AM to 6 PM. We will get back to you during business hours.',
                category: 'Information'
            },
            {
                id: '3',
                title: 'Thank You',
                message: 'Thank you for your message. We appreciate your business!',
                category: 'Closing'
            },
            {
                id: '4',
                title: 'Please Wait',
                message: 'Please give me a moment to check that information for you.',
                category: 'General'
            },
            {
                id: '5',
                title: 'Contact Info',
                message: 'You can reach us at support@company.com or call us at +91-XXXX-XXXX-XX',
                category: 'Information'
            }
        ];

        return NextResponse.json(defaultReplies);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { title, message, category } = await req.json();

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
        }

        // Try to insert into database
        try {
            const { data, error } = await supabase
                .from('instant_replies')
                .insert([{
                    title,
                    message,
                    category: category || 'General',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                id: data.id,
                message: 'Reply saved successfully'
            });
        } catch (dbError) {
            // If database fails, still return success (client will handle local storage)
            return NextResponse.json({
                success: true,
                id: Date.now().toString(),
                message: 'Reply saved locally'
            });
        }
    } catch (error) {
        console.error('Error saving instant reply:', error);
        return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }
}