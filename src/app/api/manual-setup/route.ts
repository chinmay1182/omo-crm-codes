// Manual setup endpoint for easy testing
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const results = {
      tablesCreated: false,
      userCreated: false,
      emailTest: false,
      forgotPasswordTest: false
    };

    // Step 1: Create tables
    try {
      const tablesResponse = await fetch(`${req.nextUrl.origin}/api/create-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      results.tablesCreated = tablesResponse.ok;
    } catch (error) {
      console.error('Tables creation failed:', error);
    }

    // Step 2: Create test user
    try {
      const userResponse = await fetch(`${req.nextUrl.origin}/api/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      results.userCreated = userResponse.ok;
    } catch (error) {
      console.error('User creation failed:', error);
    }

    // Step 3: Test email service
    try {
      const emailResponse = await fetch(`${req.nextUrl.origin}/api/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: 'chinmayawade21@gmail.com' })
      });
      const emailResult = await emailResponse.json();
      results.emailTest = emailResult.success && emailResult.emailSent;
    } catch (error) {
      console.error('Email test failed:', error);
    }

    // Step 4: Test forgot password
    try {
      const forgotResponse = await fetch(`${req.nextUrl.origin}/api/test-forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', email: 'chinmayawade21@gmail.com' })
      });
      const forgotResult = await forgotResponse.json();
      results.forgotPasswordTest = forgotResult.success;
    } catch (error) {
      console.error('Forgot password test failed:', error);
    }

    const allWorking = Object.values(results).every(result => result === true);

    return NextResponse.json({
      success: allWorking,
      message: allWorking ? 'All systems working!' : 'Some systems need attention',
      results,
      testCredentials: {
        email: 'chinmayawade21@gmail.com',
        password: 'TestPassword123'
      },
      nextSteps: [
        'Try logging in with the test credentials',
        'Try the forgot password flow from the login page',
        'Check your email for OTP messages'
      ]
    });

  } catch (error) {
    console.error('Manual setup error:', error);
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Manual Setup Endpoint',
    description: 'Use POST to run complete system setup and testing',
    testCredentials: {
      email: 'chinmayawade21@gmail.com',
      password: 'TestPassword123'
    }
  });
}