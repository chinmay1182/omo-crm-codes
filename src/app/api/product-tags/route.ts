import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const { data: tags, error } = await supabase
            .from('product_tags')
            .select('*')
            .order('type', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            if (error.code === '42P01' || error.code === 'PGRST204') return NextResponse.json([]);
            throw error;
        }

        return NextResponse.json(tags);
    } catch (error) {
        console.error('Error fetching product tags:', error);
        return NextResponse.json(
            { error: 'Failed to fetch product tags' },
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
        if (!['product_name', 'product_category'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid type. Must be product_name or product_category' },
                { status: 400 }
            );
        }

        // Check if tag already exists
        const { data: existingTag } = await supabase
            .from('product_tags')
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

        const tagId = uuidv4();

        const { error: insertError } = await supabase
            .from('product_tags')
            .insert([{
                id: tagId,
                name,
                type
            }]);

        if (insertError) throw insertError;

        return NextResponse.json(
            { message: 'Product tag created successfully', tagId },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating product tag:', error);
        return NextResponse.json(
            { error: 'Failed to create product tag' },
            { status: 500 }
        );
    }
}
