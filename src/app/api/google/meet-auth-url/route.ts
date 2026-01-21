import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/app/lib/googleAuth';
import { getSessionFromRequest } from '@/app/lib/session';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const meetingId = searchParams.get('meetingId');

        if (!meetingId) {
            return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 });
        }

        const session = getSessionFromRequest(request);
        const agentId = session?.user?.id;

        // Create state object with meetingId and agentId
        const stateObj = {
            meetingId,
            agentId,
            type: 'meet_auth'
        };

        const stateBase64 = Buffer.from(JSON.stringify(stateObj)).toString('base64');

        // Generate URL (passing encoded state)
        const url = getAuthUrl(stateBase64);

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error generating meet auth URL:', error);
        return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
    }
}
