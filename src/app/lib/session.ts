// src/app/lib/session.ts - Update your existing session management
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      // Fallback: Check for agent_session
      const agentSessionCookie = cookieStore.get('agent_session');
      if (agentSessionCookie?.value) {
        try {
          let val = agentSessionCookie.value;
          if (val.includes('%')) val = decodeURIComponent(val);
          const data = JSON.parse(val);
          // Handle flat or nested
          if (data.user) return { ...data, user: { ...data.user, type: 'agent' } };
          return { user: { ...data, type: 'agent' } };
        } catch (e) { console.error('Error parsing agent_session', e); }
      }
      return { user: null };
    }

    const data = JSON.parse(sessionCookie.value);

    // Handle legacy/flat session structure
    if (data.user) {
      return data;
    } else {
      return { user: data };
    }
  } catch (error) {
    console.error('Error parsing session:', error);
    return { user: null };
  }
}

export async function createSession(userId: string, googleTokens?: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}) {
  const sessionData = JSON.stringify({
    user: { id: userId },
    googleTokens: googleTokens || null
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('session', sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });

  return response;
}

export async function updateSessionWithGoogleTokens(googleTokens: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}) {
  const session = await getSession();
  if (!session.user) {
    throw new Error('No active session');
  }

  const updatedSessionData = JSON.stringify({
    ...session,
    googleTokens
  });

  const response = NextResponse.json({ success: true });

  // Determine correct cookie name based on user type
  const cookieName = session.user.type === 'agent' ? 'agent_session' : 'session';

  response.cookies.set(cookieName, updatedSessionData, {
    httpOnly: cookieName === 'session', // Agent session is not httpOnly in setRichSessionCookie (line 132), preserving that logic 
    // Wait, line 132 says httpOnly: false. Let's match it for consistency.
    // Actually, if I can make it secure, I should. But to match `setRichSessionCookie`:
    // httpOnly: false allows client access.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });

  return response;
}

export async function deleteSession() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('session');
  return response;
}

export function setSessionCookie(response: NextResponse, userId: string, userType: 'user' | 'agent' = 'user', googleTokens?: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}) {
  const sessionData = JSON.stringify({
    user: { id: userId, type: userType },
    googleTokens: googleTokens || null
  });


  response.cookies.set('session', sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  return response;
}

// Set session cookie with full user object (includes username/full_name/etc.)
export function setRichSessionCookie(response: NextResponse, user: any, googleTokens?: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}) {
  const sessionData = JSON.stringify({
    user,
    googleTokens: googleTokens || null
  });

  // Use different cookie name for agents vs regular users
  const cookieName = user.type === 'agent' ? 'agent_session' : 'session';

  response.cookies.set(cookieName, sessionData, {
    httpOnly: false, // Allow JavaScript access for client-side session management
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  return response;
}

// Function to get session from request (for API routes)
export function getSessionFromRequest(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');

    // Debug log
    if (!sessionCookie) {
    }

    if (!sessionCookie?.value) {
      // Fallback: Check for agent_session
      const agentSessionCookie = request.cookies.get('agent_session');
      if (agentSessionCookie?.value) {
        try {
          let val = agentSessionCookie.value;
          if (val.includes('%')) val = decodeURIComponent(val);
          const data = JSON.parse(val);
          if (data.user) return { ...data, user: { ...data.user, type: 'agent' } };
          return { user: { ...data, type: 'agent' } };
        } catch (e) { console.error('Error parsing agent_session from request', e); }
      }
      return { user: null };
    }

    const data = JSON.parse(sessionCookie.value);

    // Handle both nested { user: ... } and flat { id: ... } formats
    if (data.user) {
      return data;
    } else {
      return { user: data };
    }
  } catch (error) {
    console.error('Error parsing session from request:', error);
    return { user: null };
  }
}

// Function to update session with Google tokens in API routes
export function updateSessionWithGoogleTokensInResponse(
  request: NextRequest,
  response: NextResponse,
  googleTokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }
) {
  const session = getSessionFromRequest(request);
  if (!session.user) {
    throw new Error('No active session');
  }

  const updatedSessionData = JSON.stringify({
    ...session,
    googleTokens
  });

  // Determine correct cookie name based on user type
  const cookieName = session.user.type === 'agent' ? 'agent_session' : 'session';
  const isAgent = session.user.type === 'agent';

  response.cookies.set(cookieName, updatedSessionData, {
    httpOnly: !isAgent, // Match logic: agent_session usually has httpOnly: false (based on setRichSessionCookie)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });

  return response;
}