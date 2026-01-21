import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const { data: numbers, error } = await supabase
            .from('whatsapp_numbers')
            .select('*')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            // Graceful handling if table missing
            if (error.code === '42P01' || error.code === 'PGRST204') {
                return NextResponse.json([]);
            }
            throw error;
        }

        if (!numbers || numbers.length === 0) {
            // Fallback to environment variables if DB is empty
            const primary = process.env.MSG91_PRIMARY_NUMBER || '918810878185';
            const secondary = process.env.MSG91_SECONDARY_NUMBER || '915422982253';

            return NextResponse.json([
                {
                    id: 'env-primary',
                    number: primary,
                    display_name: 'Primary (Env)',
                    is_active: true,
                    is_default: true,
                    formatted: `+${primary}`
                },
                {
                    id: 'env-secondary',
                    number: secondary,
                    display_name: 'Secondary (Env)',
                    is_active: true,
                    is_default: false,
                    formatted: `+${secondary}`
                }
            ]);
        }

        return NextResponse.json(numbers);
    } catch (error) {
        console.error('Error fetching WhatsApp numbers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch WhatsApp numbers' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const {
            number,
            display_name,
            is_active = true,
            is_default = false,
            api_key,
            webhook_url
        } = await request.json();

        // Validate required fields
        if (!number || !display_name) {
            return NextResponse.json(
                { error: 'Number and display name are required' },
                { status: 400 }
            );
        }

        // Check if number already exists
        const { data: existingNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id')
            .eq('number', number)
            .single();

        if (existingNumber) {
            return NextResponse.json(
                { error: 'WhatsApp number already exists' },
                { status: 400 }
            );
        }

        const numberId = uuidv4();

        // If this is set as default, remove default from others
        if (is_default) {
            await supabase
                .from('whatsapp_numbers')
                .update({ is_default: false })
                .neq('id', 'placeholder'); // Update all rows (hackish query builder requirement sometimes, usually empty update works but filter safer)
            // Actually supabase-js allows update without filter but better be safe
            // .gt('created_at', '1970-01-01') is a common "all" filter
            // Or just don't apply filter. Supabase requires at least one filter usually unless configured otherwise.
            // Let's use `neq id 0` or similar if UUID. UUIDs are strings.
            // .neq('id', numberId) which doesn't exist yet works.
        }

        const { error: insertError } = await supabase
            .from('whatsapp_numbers')
            .insert([{
                id: numberId,
                number,
                display_name,
                is_active,
                is_default,
                api_key: api_key || null,
                webhook_url: webhook_url || null
            }]);

        if (insertError) throw insertError;

        return NextResponse.json(
            { message: 'WhatsApp number added successfully', numberId },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating WhatsApp number:', error);
        return NextResponse.json(
            { error: 'Failed to create WhatsApp number' },
            { status: 500 }
        );
    }
}