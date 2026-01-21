import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest, setRichSessionCookie } from "@/app/lib/session";

export async function POST(request: NextRequest) {
    try {
        const session = getSessionFromRequest(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agentId, profileImage } = await request.json();

        if (!agentId || !profileImage) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Authorization check (allow admin or self)
        const currentUserId = String(session.user.id);
        const targetAgentId = String(agentId);

        // Simple check: if not self, check if admin
        if (currentUserId !== targetAgentId && session.user.type !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Update the 'profile_image' column in 'agents' table
        const { data, error } = await supabase
            .from('agents')
            .update({ profile_image: profileImage })
            .eq('id', agentId)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update Session Cookie
        const updatedUser = {
            ...session.user,
            profile_image: profileImage
        };

        const response = NextResponse.json({ success: true, data });

        // Update the cookie with the new user object
        setRichSessionCookie(response, updatedUser);

        return response;
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
