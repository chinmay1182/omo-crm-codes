import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const TARGET_EMAIL = 'cso@consolegal.com';
        const DEFAULT_PASS = 'Consolegal@2026';

        if (!password) {
            return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
        }

        // 1. Try to find the specific super admin
        const { data: agent, error } = await supabase
            .from('agents')
            .select('password')
            .eq('email', TARGET_EMAIL)
            .single();

        if (agent && agent.password) {
            // Verify against agent password
            const match = await bcrypt.compare(password, agent.password);
            return NextResponse.json({ success: match });
        } else {
            // Fallback to default if agent doesn't exist yet
            // If the agent doesn't exist, we accept the default password.
            const match = password === DEFAULT_PASS;
            return NextResponse.json({ success: match });
        }
    } catch (error: any) {
        console.error('Gatekeeper error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
