import db from './db';

export const storeOTP = async (email: string, otp: string) => {
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    const result = await db.execute(
      'INSERT INTO password_reset_tokens (email, token, expires_at, created_at) VALUES (?, ?, ?, NOW())',
      [email, otp, expiresAt]
    );

    return true;
  } catch (error) {
    throw error;
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {

    const [rows] = await db.execute(
      `SELECT * FROM password_reset_tokens 
       WHERE email = ? AND token = ? AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    const isValid = Array.isArray(rows) && rows.length > 0;

    return isValid;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

export const clearOTP = async (email: string) => {
  try {

    const result = await db.execute(
      'DELETE FROM password_reset_tokens WHERE email = ?',
      [email]
    );

    return true;
  } catch (error) {
    throw error;
  }
};

// Helper function to clean up expired OTPs
export const cleanupExpiredOTPs = async () => {
  try {

    const result = await db.execute(
      'DELETE FROM password_reset_tokens WHERE expires_at <= NOW()'
    );

    return true;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    throw error;
  }
};