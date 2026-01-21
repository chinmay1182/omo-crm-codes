import { NextResponse } from 'next/server';
import { generateOTP } from '../../../lib/email';
import { storeOTP } from '../../../lib/otpStoreSupabase';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const { email, appPassword } = await request.json();

        if (!email || !appPassword) {
            return NextResponse.json(
                { error: 'Email and App Password are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        const otp = generateOTP();

        // Store OTP in the database
        await storeOTP(email, otp);

        // Create transporter with user-provided credentials
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: email,
                pass: appPassword,
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true,
        });

        // Send Email
        try {
            await transporter.sendMail({
                from: `"Consolegal CRM" <${email}>`,
                to: email,
                subject: 'Super Admin Password Reset OTP',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Super Admin Password Reset</h2>
                        <p>You have requested to reset the password for the Super Admin account (${email}).</p>
                        <p>Your OTP is:</p>
                        <h1 style="color: #000; letter-spacing: 5px;">${otp}</h1>
                        <p>This OTP is valid for 15 minutes.</p>
                    </div>
                `
            });

            return NextResponse.json({ success: true, message: 'OTP sent successfully' });

        } catch (emailError: any) {
            console.error('❌ Failed to send OTP email:', emailError);

            // Provide helpful error messages
            if (emailError.code === 'EAUTH' || emailError.responseCode === 535) {
                return NextResponse.json({
                    error: 'Email authentication failed. Please check your App Password and try again.'
                }, { status: 401 });
            }

            return NextResponse.json({
                error: `Failed to send email: ${emailError.message}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Superuser Send OTP error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
