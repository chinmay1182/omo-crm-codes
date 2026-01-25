'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './register.module.css';
import Gatekeeper from '../components/Auth/Gatekeeper';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          phone_number: formData.phoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success - redirect to login
      alert('Super Admin account created successfully! Please login.');
      router.push('/agent-login');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Gatekeeper>
      <div className={styles.container}>
        <div className={styles.imageSection}>
          <div className={styles.imageContent}>
            <h2>Join Omo CRM</h2>
            <p>Start your journey to better business management today.</p>
          </div>
        </div>
        <div className={styles.formSection}>
          <div className={styles.contentWrapper}>
            <div className={styles.header}>
              <h1 style={{ fontSize: '24px', fontWeight: 300, marginBottom: '10px' }}>Create Super Admin Account</h1>
              <p>Register the first administrator for your CRM</p>
            </div>

            {error && (
              <div className={styles.error}>
                <i className="fa-light fa-circle-exclamation"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="username">Username *</label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter email"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="fullName">Full Name *</label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  placeholder="Enter full name"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Enter password (min 6 characters)"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  placeholder="Re-enter password"
                  disabled={loading}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <>
                    <i className="fa-light fa-spinner fa-spin"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Super Admin Account
                  </>
                )}
              </button>
            </form>

            <div className={styles.footer}>
              <p>
                Already have an account?{' '}
                <a href="/login">Login here</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Gatekeeper>
  );
}