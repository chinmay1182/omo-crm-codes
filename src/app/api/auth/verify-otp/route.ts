import { NextResponse } from 'next/server';
import { verifyOTP } from '../../../lib/otpStore';

export async function POST(request: Request) {
  const { email, otp } = await request.json();


  if (!email || !otp) {
    return NextResponse.json(
      { error: 'Email and OTP are required' },
      { status: 400 }
    );
  }

  // Enhanced email format validation - supports any domain
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address' },
      { status: 400 }
    );
  }

  // Convert email to lowercase for consistent comparison
  const normalizedEmail = email.toLowerCase().trim();

  // Validate OTP format (should be 6 digits)
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json(
      { error: 'OTP must be 6 digits' },
      { status: 400 }
    );
  }

  try {
    const isValid = await verifyOTP(normalizedEmail, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'OTP verified successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}