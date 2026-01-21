// Get Gmail user info
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession } from '@/app/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session.user || !session.googleTokens?.accessToken) {
      return NextResponse.json({ 
        error: 'Not authenticated', 
        authenticated: false,
        message: 'Gmail not connected' 
      }, { status: 200 }); // Return 200 instead of 401 to prevent frontend loops
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.googleTokens.accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth });
    const userInfo = await oauth2.userinfo.get();

    return NextResponse.json({
      authenticated: true,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({ 
      error: 'Failed to get user info', 
      authenticated: false,
      message: 'Gmail connection error'
    }, { status: 200 }); // Return 200 to prevent frontend loops
  }
}