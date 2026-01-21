
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ shareUrl: string }> }) {
    try {
        const { shareUrl } = await params;

        // Increment visit count (async, don't await)
        // Ideally use RPC but update works
        // We do NOT want to increment if not found, but it's okay.

        const { data, error } = await supabase
            .from('forms')
            .select('id, name, description, content, published, share_url, visits')
            .eq('share_url', shareUrl)
            .single();

        if (error) throw error;

        // Increment visit
        const { error: rpcError } = await supabase.rpc('increment_visits', { row_id: data.id });

        if (rpcError) {
            // Fallback update
            await supabase.from('forms').update({ visits: (data as any).visits + 1 }).eq('id', data.id);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
