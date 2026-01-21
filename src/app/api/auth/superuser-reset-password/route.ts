import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';
import { verifyOTP, clearOTP } from '../../../lib/otpStoreSupabase';

export async function POST(request: Request) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({
                error: 'Email, OTP and New Password are required'
            }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // 1. Verify OTP
        const isValid = await verifyOTP(email, otp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        // 2. Find Agent
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id')
            .eq('email', email)
            .single();

        if (agentError || !agent) {
            return NextResponse.json(
                { error: `Account with email ${email} does not exist. Please register first.` },
                { status: 404 }
            );
        }

        // 3. Update Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error: updateError } = await supabase
            .from('agents')
            .update({ password: hashedPassword, updated_at: new Date().toISOString() })
            .eq('id', agent.id);

        if (updateError) throw updateError;

        // 4. Clear OTP
        await clearOTP(email);

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error: any) {
        console.error('Superuser reset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update password' },
            { status: 500 }
        );
    }
}
