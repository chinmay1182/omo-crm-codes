import { NextResponse } from 'next/server';

const BASE_URL = 'https://cts.myvi.in:8443/Cpaas/api/clicktocall';

export async function POST(request: Request) {
  try {
    const { token, endpoint, payload } = await request.json();

    if (!endpoint || !payload) {
      return NextResponse.json(
        { error: 'Missing endpoint or payload' },
        { status: 400 }
      );
    }

    // Token mandatory nahi hai agar endpoint AuthToken ho
    if (endpoint !== 'AuthToken' && (!token || token.trim() === '')) {
      return NextResponse.json(
        { error: 'Missing token for endpoint ' + endpoint },
        { status: 400 }
      );
    }

    const url = `${BASE_URL}/${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (endpoint !== 'AuthToken') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from CPaaS API:', response.status, errorText);
      return NextResponse.json(
        { error: `CPaaS API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();


    return NextResponse.json(data);

  } catch (error) {
    console.error('Server error in /api/call:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
