// Gmail OAuth URL generator
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI! // This should be your Gmail callback URL
);

export async function GET(request: Request) {
  try {
    // Get current session to include user ID in state
    const { getSession } = await import('@/app/lib/session');
    const session = await getSession();

    if (!session.user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    // Include user ID in state so we can retrieve it in callback
    const stateData = {
      type: 'gmail_auth',
      userId: session.user.id
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      prompt: 'consent',
      state: state
    });

    return NextResponse.json({ authUrl: authorizationUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}