/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Spinner from '@/app/components/Spinner/Spinner';
import styles from './styles.module.css';
import { useAuth } from '@/app/context/AuthContext';

export default function LoginForm() {
  // Use 'admin@example.com' as default for convenience if helpful, or empty
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Single login form for both Agents and Admins
      await login(username, password, 'agent');
      toast.success('Login successful! Redirecting...');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSection}></div>
      <div className={styles.formSection}>
        <form onSubmit={handleLogin} className={styles.form}>
          <Image
            src="/consolegal.jpeg"
            alt="Consolegal Logo"
            width={120}
            height={120}
            className={styles.logo}
            unoptimized
          />
          <h2 style={{ fontSize: '24px', fontWeight: 300, marginBottom: '10px' }}>Log in to your account</h2>
          {error && <div className={styles.error}>{error}</div>}
          <div>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" disabled={loading} className={styles.primaryButton}>
            {loading && <span className="inlineSpinner"></span>}
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <button
            type="button"
            className={styles.googleButton}
            onClick={() => router.push('/register')}
          >
            <span>Register</span>
          </button>

          <p className={styles.termsText}>
            By logging in, I agree to the <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a> of Consolegal.
          </p>
        </form>
      </div>
    </div>
  );
}