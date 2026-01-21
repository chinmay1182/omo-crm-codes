import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

const AUTH_URL = 'https://cts.myvi.in:8443/Cpaas/api/clicktocall/AuthToken';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { cli_number } = body;

    let username = process.env.CPASS_USERNAME;
    let password = process.env.CPASS_PASSWORD;

    // If specific CLI requested, look it up in DB
    if (cli_number) {
      const { data: cliData } = await supabase
        .from('cli_numbers')
        .select('auth_username, auth_password')
        .eq('number', cli_number)
        .single();

      if (cliData && cliData.auth_username && cliData.auth_password) {
        username = cliData.auth_username;
        password = cliData.auth_password;
      }
    }

    // Fallback to default if no specific credentials found yet
    if ((!username || !password) && !cli_number) {
      const { data: defaultCli } = await supabase
        .from('cli_numbers')
        .select('auth_username, auth_password, number')
        .eq('is_default', true)
        .neq('auth_username', null)
        .limit(1)
        .maybeSingle();

      if (defaultCli && defaultCli.auth_username && defaultCli.auth_password) {
        username = defaultCli.auth_username;
        password = defaultCli.auth_password;
      }
    }

    if (!username || !password) {
      console.warn('Missing CPaaS credentials (Env or DB)');
      return NextResponse.json({ error: 'Missing credentials configuration' }, { status: 400 });
    }

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Auth Failed Response Body: ${text}`);
      return NextResponse.json({ error: 'Authentication failed', details: text }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error("Auth Token Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
