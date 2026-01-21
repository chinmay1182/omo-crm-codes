import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });

  if (!token?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token.accessToken as string });

  const gmail = google.gmail({ version: 'v1', auth });

  try {
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    return NextResponse.json(messages.data);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
