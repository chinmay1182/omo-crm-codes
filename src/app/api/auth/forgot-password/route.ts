import { NextResponse } from 'next/server';
import { generateOTP, sendMail } from '../../../lib/email';
import { storeOTP } from '../../../lib/otpStore';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      { error: 'Email is required' },
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

  try {
    // Check if user exists using normalized email
    const { data: users, error } = await supabase
      .from('users')
      .select('email')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (error) throw error;

    if (users && users.length > 0) {

      const otp = generateOTP();

      // storeOTP will handle clearing existing tokens
      await storeOTP(normalizedEmail, otp);

      const mailSent = await sendMail({
        to: normalizedEmail,
        subject: 'Your Password Reset OTP - Consolegal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">Consolegal</h1>
              <h2 style="color: #007bff; margin-top: 0;">Password Reset Request</h2>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 16px;">Your OTP for password reset is:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #007bff; background-color: white; padding: 15px 25px; border-radius: 8px; border: 2px solid #007bff; display: inline-block;">${otp}</span>
              </div>
            </div>
            
            <div style="color: #666; font-size: 14px; line-height: 1.5;">
              <p><strong>Important:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This OTP is valid for <strong>15 minutes</strong> only</li>
                <li>Do not share this OTP with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
                <li><strong>This email is registered in our system</strong></li>
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This email was sent from Consolegal CRM System<br>
              Registered Email: ${normalizedEmail}
            </p>
          </div>
        `,
      });


      if (!mailSent) {
        return NextResponse.json(
          { error: 'Failed to send OTP email. Please try again.' },
          { status: 500 }
        );
      }


      // Return success with confirmation for registered users
      return NextResponse.json(
        {
          message: 'OTP sent successfully to your registered email address.',
          email: normalizedEmail
        },
        { status: 200 }
      );
    } else {

      // For unregistered emails, return a different message
      return NextResponse.json(
        {
          error: 'This email address is not registered with us. Please check your email or register first.',
          suggestion: 'Make sure you are using the same email address you used during registration.'
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}