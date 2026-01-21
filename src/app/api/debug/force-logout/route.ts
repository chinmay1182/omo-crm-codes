import { NextResponse } from 'next/server';

export async function GET() {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear all authentication cookies
    const cookiesToClear = ['session', 'agent_session', 'agent-token', 'auth-token'];

    cookiesToClear.forEach(cookieName => {
        // Delete the cookie
        response.cookies.delete(cookieName);

        // Also set to empty with maxAge 0 for extra safety
        response.cookies.set(cookieName, '', {
            maxAge: 0,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
    });

    return response;
}
