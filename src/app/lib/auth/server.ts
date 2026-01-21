// lib/auth/server.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '../../lib/db';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || '8f7d2c9a4e1b6f0e3a9c2d5f7b1e4c6a9d8e0f2b3a5c7e9f1d4b6a8c0e2';
const COOKIE_NAME = 'auth-token';

export async function createSession(userId: number) {
  try {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });

    // Clear any existing sessions for this user first
    await pool.query(
      'DELETE FROM sessions WHERE user_id = ?',
      [userId]
    );

    // Insert new session
    await pool.query(
      'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
      [userId, token]
    );

    (await cookies()).set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60
    });

    return token;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

export async function verifySession() {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { userId } = jwt.verify(token, JWT_SECRET) as { userId: number };

    const [rows] = await pool.query(
      'SELECT 1 FROM sessions WHERE user_id = ? AND session_token = ? AND expires_at > NOW()',
      [userId, token]
    );

    return (rows as any[]).length ? userId : null;
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [token]);
    }
    cookieStore.delete(COOKIE_NAME);
  } catch (error) {
    console.error('Error destroying session:', error);
  }
}

export async function verifyCredentials(username: string, password: string) {
  try {

    const [rows] = await pool.query(
      'SELECT id, username, password FROM users WHERE username = ?',
      [username]
    );

    const users = rows as any[];

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    const isValid = await bcrypt.compare(password, user.password);

    return isValid ? { id: user.id, username: user.username } : null;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return null;
  }
}