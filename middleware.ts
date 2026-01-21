// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Setup rate limiter: 20 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';

  try {
    await rateLimiter.consume(ip);
  } catch {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const session = request.cookies.get('session')?.value;
  const agentSession = request.cookies.get('agent_session')?.value;
  const agentToken = request.cookies.get('agent-token')?.value;
  const { pathname } = request.nextUrl;

  // Validate regular user session if it exists
  let isValidSession = false;

  // Check regular session
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      isValidSession = sessionData && sessionData.user && sessionData.user.id;
    } catch (error) {
      // invalid session
    }
  }

  // Check agent session if regular session not found
  if (!isValidSession && agentSession) {
    try {
      // Decode if URI encoded (cookies sometimes are)
      const decoded = decodeURIComponent(agentSession);
      const sessionData = JSON.parse(decoded);
      // Support nested structure { user: ... } or flat structure
      const user = sessionData.user || sessionData;
      isValidSession = !!(user && user.id);
    } catch (error) {
      // invalid agent session
    }
  }

  // Validate agent token if it exists
  let isValidAgentToken = false;
  if (agentToken) {
    try {
      // For middleware, we'll do a basic check to avoid importing heavy JWT libraries
      // The actual verification happens in the API routes
      const parts = agentToken.split('.');
      isValidAgentToken = parts.length === 3; // Basic JWT structure check
    } catch (error) {
      console.error('Invalid agent token:', error);
      isValidAgentToken = false;
    }
  }

  // Protected routes - require valid session
  // Protected routes - require valid session
  const protectedRoutes = ['/dashboard', '/profile']; // Protected routes that require authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Agent protected routes - require valid agent token
  const agentProtectedRoutes = ['/agent-dashboard'];
  const isAgentProtectedRoute = agentProtectedRoutes.some(route => pathname.startsWith(route));

  // Agent auth routes
  const agentAuthRoutes = ['/agent-login'];
  const isAgentAuthRoute = agentAuthRoutes.includes(pathname);

  if (isProtectedRoute && !isValidSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Add cache control headers to prevent caching of protected pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // Agent dashboard protection - allow agents with regular sessions
  if (isAgentProtectedRoute && !isValidAgentToken && !isValidSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Add cache control headers to prevent caching of protected pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // Auth routes - redirect authenticated users away
  const authRoutes = ['/login', '/register', '/']; // Add root path to auth routes
  const isAuthRoute = authRoutes.includes(pathname);

  if (isAuthRoute && isValidSession) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // Agent auth routes - redirect authenticated agents away
  if (isAgentAuthRoute && (isValidSession || isValidAgentToken)) {
    const redirectUrl = '/agent-dashboard';
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // Handle root path for unauthenticated users - redirect to login
  if (pathname === '/' && !isValidSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // Create response with appropriate headers
  const response = NextResponse.next();

  // Add security headers for all routes
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add cache control headers for auth-sensitive pages
  if (isProtectedRoute || isAuthRoute) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

// Limit middleware to API and pages routes only, but exclude webhook endpoints
export const config = {
  matcher: [
    '/api/((?!webhook|debug-webhook|pingback).*)', // Exclude webhook endpoints from middleware
    '/dashboard/:path*',
    '/profile/:path*',
    '/login',
    '/register',
    '/agent-login',
    '/agent-dashboard/:path*',
    '/'
  ],
};
