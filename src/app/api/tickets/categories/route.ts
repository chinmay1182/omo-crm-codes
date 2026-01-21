
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
    try {
        // Fetch distinct categories from tickets
        const { data, error } = await supabase
            .from('tickets')
            .select('category');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Extract unique categories
        // @ts-ignore
        const categories = [...new Set(data.map(item => item.category).filter(Boolean))];

        // Return only categories that exist in the database (real-time data)
        const allCategories = categories.sort();

        return NextResponse.json(allCategories);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
