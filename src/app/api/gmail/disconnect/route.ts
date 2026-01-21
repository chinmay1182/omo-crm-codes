// Disconnect Gmail by removing Google tokens from session
import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Create updated session without Google tokens
    const updatedSessionData = JSON.stringify({
      user: session.user,
      googleTokens: null
    });

    const response = NextResponse.json({ success: true, message: 'Gmail disconnected successfully' });
    
    response.cookies.set('session', updatedSessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 });
  }
}