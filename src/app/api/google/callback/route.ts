import { getOAuthClient, createGoogleMeet } from '@/app/lib/googleAuth';
import { NextResponse, NextRequest } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Setup Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');



  if (error) {
    console.error('OAuth error received:', error);
    return NextResponse.redirect(new URL('/dashboard/emails?error=oauth_failed', request.url));
  }

  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(new URL('/dashboard/emails?error=auth_failed', request.url));
  }

  try {
    // Parse state to get user information
    let stateData: any;
    try {
      if (state) {
        // Simple fix for potential TS error: ensure state is passed
        const decoded = Buffer.from(state, 'base64').toString();
        if (decoded.trim().startsWith('{')) {
          stateData = JSON.parse(decoded);
        } else {
          throw new Error('Not Base64 JSON');
        }
      }
    } catch (error) {
      // Fallback for old state format (just the string)
      stateData = { type: state };
    }

    if (stateData.type === 'gmail_auth') {
      // Handle Gmail OAuth
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || '748305760307-j2eu9ks5kauci3uv09ob3rmik8ffcvme.apps.googleusercontent.com',
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.GOOGLE_REDIRECT_URI || 'https://crm.consolegal.com/api/google/callback'
      );

      const { tokens } = await oauth2Client.getToken(code);

      // Get user ID from state instead of session
      const userId = stateData.userId;
      if (!userId) {
        return NextResponse.redirect(new URL('/login?error=session_expired', request.url));
      }


      // Store tokens in session
      const googleTokens = {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date
      };

      // Create session data with user ID from state and Google tokens
      const updatedSessionData = JSON.stringify({
        user: { id: userId },
        googleTokens
      });

      // Create redirect response and set updated session cookie
      const redirectResponse = NextResponse.redirect(new URL('/dashboard/emails?success=gmail_connected', request.url));

      redirectResponse.cookies.set('session', updatedSessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      return redirectResponse;
    } else {
      // Handle Google Meet OAuth
      // Use parsed stateData if available, otherwise fallback to raw state (legacy)
      const meetingId = stateData?.meetingId || state;
      const agentId = stateData?.agentId;

      if (!meetingId) {
        return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
      }

      const auth = await getOAuthClient(code);
      const tokens = auth.credentials;

      // Save tokens to agent's profile if agentId is present
      // Using Admin Client to ensure we can write to agents table regardless of RLS
      if (agentId && tokens) {
        try {
          const { error: tokenError } = await supabaseAdmin
            .from('agents')
            .update({
              google_access_token: tokens.access_token,
              google_refresh_token: tokens.refresh_token, // Only present on first consent or forced prompt
              google_token_expiry: tokens.expiry_date,
              google_connected: true
            })
            .eq('id', agentId);

          if (tokenError) {
            console.error('Failed to save Google tokens:', tokenError);
          } else {
          }
        } catch (e) {
          console.error('Error saving tokens:', e);
        }
      }

      // Get the specific meeting by ID - Use Admin Client
      const { data: meeting, error } = await supabaseAdmin
        .from('company_meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error || !meeting) {
        throw new Error('Meeting not found');
      }

      const { meetLink } = await createGoogleMeet(auth, {
        title: meeting.title,
        startTime: new Date(meeting.meeting_date).toISOString(),
        endTime: new Date(new Date(meeting.meeting_date).getTime() + (meeting.duration * 60000)).toISOString(), // Calculate end time
        description: meeting.description,
      });

      // Update meeting - Use Admin Client
      await supabaseAdmin
        .from('company_meetings')
        .update({ meeting_link: meetLink, google_meet_link: meetLink, status: 'scheduled' }) // Update both link fields
        .eq('id', meeting.id);

      // Redirect back to meetings dashboard
      return NextResponse.redirect(new URL('/dashboard/meetings?success=meet_created', request.url));
    }

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    // Be careful with state access here as it might be complex object in new implementation
    // But our searchParams 'state' is the raw string, so 'gmail_auth' check might still work if it wasn't valid base64
    // However, if we encoded 'meet_auth' as base64, `state === 'gmail_auth'` will be false.
    // We should rely on `stateData?.type` if available, but here `stateData` might not be in scope if error happened early.

    // Safest fallback:
    const isGmail = (typeof state === 'string' && state === 'gmail_auth');

    const errorParam = isGmail ? 'gmail_auth_failed' : 'auth_failed';
    const redirectUrl = isGmail ? '/dashboard/emails' : '/';
    return NextResponse.redirect(new URL(`${redirectUrl}?error=${errorParam}`, request.url));
  }
}
