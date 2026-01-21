import { supabase } from './supabase';

export const storeOTP = async (email: string, otp: string) => {
    try {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

        // First, delete any existing tokens for this email to keep it clean
        await supabase
            .from('password_reset_tokens')
            .delete()
            .eq('email', email);

        const { data, error } = await supabase
            .from('password_reset_tokens')
            .insert({
                email,
                token: otp,
                expires_at: expiresAt
            })
            .select();

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
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Supabase verification error:', error);
            throw error;
        }

        const isValid = !!data;

        return isValid;
    } catch (error) {
        console.error('Error verifying OTP in Supabase:', error);
        return false; // Fail safe
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
        console.error('Error clearing OTP in Supabase:', error);
        throw error;
    }
};
