import { supabase } from './supabase';

export const checkRateLimit = async (email: string, limit: number, windowMinutes: number) => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('password_reset_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gt('created_at', windowStart);

    if (error) {
      console.error('Rate limit check failed:', error);
      return true; // Fail open
    }

    return (count || 0) < limit;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Fail open
  }
};