import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as publicSupabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function GET() {
    try {
        // Use Service Role if available to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co'
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

        const supabase = (supabaseUrl && supabaseServiceKey)
            ? createClient(supabaseUrl, supabaseServiceKey)
            : publicSupabase;

        const results = {
            contactsUpdated: 0,
            companiesUpdated: 0,
            errors: [] as string[]
        };

        // 1. Backfill Contacts
        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('id, display_id')
            .is('display_id', null);

        if (contactsError) throw contactsError;

        if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
                const newId = generateId();
                const { error: updateError } = await supabase
                    .from('contacts')
                    .update({ display_id: newId })
                    .eq('id', contact.id);

                if (updateError) {
                    results.errors.push(`Failed to update contact ${contact.id}: ${updateError.message}`);
                } else {
                    results.contactsUpdated++;
                }
            }
        }

        // 2. Backfill Companies
        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('id, display_id')
            .is('display_id', null);

        if (companiesError) throw companiesError;

        if (companies && companies.length > 0) {
            for (const company of companies) {
                const newId = generateId();
                const { error: updateError } = await supabase
                    .from('companies')
                    .update({ display_id: newId })
                    .eq('id', company.id);

                if (updateError) {
                    results.errors.push(`Failed to update company ${company.id}: ${updateError.message}`);
                } else {
                    results.companiesUpdated++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Backfill completed',
            results
        });

    } catch (error: any) {
        console.error('Backfill error:', error);
        return NextResponse.json(
            { error: error.message || 'Backfill failed' },
            { status: 500 }
        );
    }
}
