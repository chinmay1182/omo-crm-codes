import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '../../../lib/db';
import { verifyOTP, clearOTP } from '../../../lib/otpStore';

export async function POST(request: Request) {
  const { email, otp, newPassword } = await request.json();

  // Validate input
  if (!email || !otp || !newPassword) {
    return NextResponse.json(
      { error: 'Email, OTP and new password are required' },
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

  // Validate password strength
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters long' },
      { status: 400 }
    );
  }

  // Additional password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (!passwordRegex.test(newPassword)) {
    return NextResponse.json(
      { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
      { status: 400 }
    );
  }

  try {
    // Verify OTP first using normalized email
    const isValid = await verifyOTP(normalizedEmail, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find user in database using normalized email
    const [users] = await db.execute(
      'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'This email is not registered with us. Please register first.' },
        { status: 404 }
      );
    }

    const user = users[0] as any;

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password in database using normalized email
    const updateResult = await db.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE LOWER(email) = ?',
      [hashedPassword, normalizedEmail]
    );


    await clearOTP(normalizedEmail);

    return NextResponse.json(
      {
        message: 'Password reset successfully! You can now login with your new password.',
        email: normalizedEmail
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}