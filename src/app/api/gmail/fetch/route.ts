// src/app/api/gmail/fetch/route.ts - Updated to use custom session
export const runtime = 'nodejs';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';

async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();


    if (!session.user) {
      return NextResponse.json({
        error: 'Not authenticated - Please login first',
        needsAuth: true
      }, { status: 401 });
    }

    if (!session.googleTokens?.accessToken) {
      return NextResponse.json({
        error: 'Google authentication required - Please connect Gmail',
        needsGoogleAuth: true
      }, { status: 401 });
    }

    let accessToken = session.googleTokens.accessToken;
    let tokenUpdateResponse: NextResponse | null = null;

    // Check if token is expired and refresh if needed
    if (session.googleTokens.expiresAt && session.googleTokens.refreshToken) {
      const now = Date.now();
      if (now >= session.googleTokens.expiresAt) {
        try {
          const newTokens = await refreshAccessToken(session.googleTokens.refreshToken);
          accessToken = newTokens.access_token!;

          // Update session with new tokens
          const { updateSessionWithGoogleTokens } = await import('@/app/lib/session');
          tokenUpdateResponse = await updateSessionWithGoogleTokens({
            accessToken: newTokens.access_token!,
            refreshToken: newTokens.refresh_token || session.googleTokens.refreshToken,
            expiresAt: newTokens.expiry_date || undefined
          });
        } catch (error) {
          console.error('Token refresh error:', error);
          return NextResponse.json({
            error: 'Token refresh failed - Please re-authenticate',
            needsGoogleAuth: true
          }, { status: 401 });
        }
      }
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });


    // Get maxResults from query parameter, default to 50
    const url = new URL(req.url);
    const maxResults = parseInt(url.searchParams.get('maxResults') || '50');

    // First, get the list of messages
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: Math.min(maxResults, 100), // Cap at 100 for performance
    });

    const messages = messagesResponse.data.messages || [];

    if (messages.length === 0) {
      return NextResponse.json([]);
    }

    // Get detailed information for each message
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        try {
          const message = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
          });

          const headers = message.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)';
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
          const dateHeader = headers.find(h => h.name === 'Date')?.value;
          const snippet = message.data.snippet || '';

          // Parse date or use current date as fallback
          let date = new Date().toISOString();
          if (dateHeader) {
            try {
              date = new Date(dateHeader).toISOString();
            } catch (e) {
              console.warn('Failed to parse date:', dateHeader);
            }
          }

          return {
            id: msg.id!,
            subject,
            from,
            snippet,
            date,
          };
        } catch (error) {
          console.error('Error fetching message:', msg.id, error);
          return null;
        }
      })
    );

    // Filter out failed messages
    const validEmails = emailDetails.filter(email => email !== null);

    const finalResponse = NextResponse.json(validEmails);

    // If we refreshed the token, we need to pass the set-cookie header
    if (tokenUpdateResponse) {
      tokenUpdateResponse.cookies.getAll().forEach(cookie => {
        finalResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
    }

    return finalResponse;
  } catch (error: any) {
    console.error('Gmail API Error:', error);

    // Handle specific authentication errors
    if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
      return NextResponse.json({
        error: 'Authentication failed - Please sign in again',
        needsGoogleAuth: true
      }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to fetch emails',
      details: error.message
    }, { status: 500 });
  }
}