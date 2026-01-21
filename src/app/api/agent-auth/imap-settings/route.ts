import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/app/lib/supabase';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('agent-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const agentId = payload.agentId;
        const body = await request.json(); // Expecting imap settings object

        if (!agentId) {
            console.error('Save IMAP Settings: No agentId in token payload');
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }


        // Update agents table
        const { error } = await supabase
            .from('agents')
            .update({ imap_settings: body })
            .eq('id', agentId);

        if (error) {
            console.error('Save IMAP Settings: DB Error:', error);
            return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error in save imap settings:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
