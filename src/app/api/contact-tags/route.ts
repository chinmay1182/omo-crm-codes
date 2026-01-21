import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const { data: tags, error } = await supabase
            .from('contact_tags')
            .select('*')
            .order('type', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            // If table doesn't exist yet (PGRST204 or 42P01), return empty array
            if (error.code === '42P01' || error.code === 'PGRST204') {
                return NextResponse.json([]);
            }
            throw error;
        }

        return NextResponse.json(tags);
    } catch (error) {
        console.error('Error fetching contact tags:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contact tags' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { name, type } = await request.json();

        // Validate required fields
        if (!name || !type) {
            return NextResponse.json(
                { error: 'Name and type are required' },
                { status: 400 }
            );
        }

        // Validate type
        if (!['contact_tag', 'company_tag'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid type. Must be contact_tag or company_tag' },
                { status: 400 }
            );
        }

        // Check if tag already exists
        const { data: existingTag } = await supabase
            .from('contact_tags')
            .select('id')
            .eq('name', name)
            .eq('type', type)
            .single();

        if (existingTag) {
            return NextResponse.json(
                { error: 'Tag with this name already exists' },
                { status: 400 }
            );
        }

        const tagId = uuidv4(); // Or let Supabase generate simple ID if using bigint? Schema says bigint. 
        // Note: Schema says id bigint generated always as identity. 
        // UUID provided here might fail if we try to insert string into bigint.
        // I should check `supabase_schema.sql` line 38: `id bigint generated always as identity primary key`
        // So I should NOT pass UUID string as ID.
        // Removing explicit ID insert.

        const { data, error } = await supabase
            .from('contact_tags')
            .insert([{
                name,
                type
            }])
            .select('id')
            .single();

        if (error) throw error;

        return NextResponse.json(
            { message: 'Contact tag created successfully', tagId: data.id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating contact tag:', error);
        return NextResponse.json(
            { error: 'Failed to create contact tag' },
            { status: 500 }
        );
    }
}