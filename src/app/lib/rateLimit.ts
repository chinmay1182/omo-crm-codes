import db from '../lib/db';

export const checkRateLimit = async (email: string, limit: number, windowMinutes: number) => {
  try {
    const [results] = await db.execute(
      `SELECT COUNT(*) as count FROM password_reset_tokens 
       WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [email, windowMinutes]
    );

    const count = Array.isArray(results) && results[0] ? (results[0] as any).count : 0;
    return count < limit;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Fail open in case of error
  }
};