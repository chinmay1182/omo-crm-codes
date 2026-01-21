
// src/app/api/auth/google/callback/route.ts - Create this for OAuth callback
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { setSessionCookie } from '@/app/lib/session';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/dashboard/emails?error=access_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/emails?error=no_code', request.url));
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user info
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Create or update user in your database
    // const user = await createOrUpdateUser(userInfo);

    // For now, we'll use the Google ID as the user ID
    const userId = userInfo.id!;

    // Create session with Google tokens
    const response = NextResponse.redirect(new URL('/dashboard/emails', request.url));
    
    return setSessionCookie(response, userId, {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard/emails?error=oauth_failed', request.url));
  }
}