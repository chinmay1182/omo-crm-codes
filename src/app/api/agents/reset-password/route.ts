import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { agentId, newPassword } = await request.json();

    if (!agentId || !newPassword) {
      return NextResponse.json({ error: 'Agent ID and new password required' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('agents')
      .update({ password: hashedPassword })
      .eq('id', agentId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}