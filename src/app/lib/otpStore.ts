import { supabase } from './supabase';

export const storeOTP = async (email: string, otp: string) => {
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

    // Delete existing tokens for this email first (optional, to keep clean)
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('email', email);

    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        email,
        token: otp,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('email', email)
      .eq('token', otp)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

export const clearOTP = async (email: string) => {
  try {
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('email', email);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

// Helper function to clean up expired OTPs
export const cleanupExpiredOTPs = async () => {
  try {
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lte('expires_at', new Date().toISOString());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    throw error;
  }
};