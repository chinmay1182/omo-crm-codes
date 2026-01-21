'use client';

import { useState } from 'react';
// import { useRouter } from 'next/navigation';
import styles from './reset-password.module.css';
import Gatekeeper from '../components/Auth/Gatekeeper';

export default function ResetPasswordPage() {
    // const router = useRouter(); // Unused
    // const [currentPassword, setCurrentPassword] = useState(''); // Unused
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const [step, setStep] = useState<'config' | 'request' | 'verify'>('config');
    const [otp, setOtp] = useState('');

    // Email configuration
    const [emailConfig, setEmailConfig] = useState({
        email: '',
        appPassword: ''
    });

    const saveEmailConfig = () => {
        if (!emailConfig.email || !emailConfig.appPassword) {
            setError('Please enter both email and app password');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailConfig.email)) {
            setError('Please enter a valid email address');
            return;
        }

        setError('');
        setSuccess('Email configuration saved! You can now send OTP.');
        setStep('request');
    };

    const sendOtp = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/auth/superuser-send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailConfig.email,
                    appPassword: emailConfig.appPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            setSuccess(`OTP sent to ${emailConfig.email}! It expires in 15 minutes.`);
            setStep('verify');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!otp) {
            setError('Please enter the OTP');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/superuser-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailConfig.email,
                    otp,
                    newPassword: formData.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Password reset failed');
            }

            setSuccess('Password updated successfully! The access password is now updated.');
            setStep('config'); // Reset to config
            setFormData({ newPassword: '', confirmPassword: '' });
            setOtp('');
            setEmailConfig({ email: '', appPassword: '' });

        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Gatekeeper>
            <div className={styles.container}>
                <div className={styles.resetBox}>
                    <div className={styles.header}>
                        <h1>Reset Super Admin Password</h1>
                        <p>Configure your email settings to receive OTP</p>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            <i className="fa-light fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={styles.success}>
                            <i className="fa-light fa-circle-check"></i>
                            {success}
                        </div>
                    )}

                    {step === 'config' ? (
                        <div className={styles.form}>
                            <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '1.5rem' }}>
                                Enter your Gmail email and App Password to receive OTP
                            </p>

                            <div className={styles.formGroup}>
                                <label htmlFor="email">Gmail Email Address *</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={emailConfig.email}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                                    placeholder="your-email@gmail.com"
                                    disabled={loading}
                                />
                                <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                    The email where you want to receive the OTP
                                </small>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="appPassword">Gmail App Password *</label>
                                <input
                                    id="appPassword"
                                    type="password"
                                    value={emailConfig.appPassword}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, appPassword: e.target.value })}
                                    placeholder="16-character app password"
                                    disabled={loading}
                                />
                                <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                    Generate from: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#15426d' }}>Google App Passwords</a>
                                </small>
                            </div>

                            <button
                                type="button"
                                onClick={saveEmailConfig}
                                className={styles.submitBtn}
                                disabled={loading}
                            >
                                <i className="fa-light fa-check"></i>
                                Save Configuration
                            </button>
                        </div>
                    ) : step === 'request' ? (
                        <div className={styles.form}>
                            <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, color: '#374151', fontSize: '0.875rem' }}>
                                    <strong>Configured Email:</strong> {emailConfig.email}
                                </p>
                            </div>

                            <p style={{ textAlign: 'center', color: '#4b5563' }}>
                                To securely reset the password, we will send a One-Time Password (OTP) to your configured email address.
                            </p>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => { setStep('config'); setSuccess(''); setError(''); }}
                                    className={styles.submitBtn}
                                    style={{ backgroundColor: '#6b7280' }}
                                    disabled={loading}
                                >
                                    <i className="fa-light fa-arrow-left"></i>
                                    Change Email
                                </button>
                                <button
                                    type="button"
                                    onClick={sendOtp}
                                    className={styles.submitBtn}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <i className="fa-light fa-spinner fa-spin"></i>
                                            Sending OTP...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-light fa-paper-plane"></i>
                                            Send OTP to Email
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={verifyAndReset} className={styles.form}>

                            <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, color: '#374151', fontSize: '0.875rem' }}>
                                    <strong>OTP sent to:</strong> {emailConfig.email}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setStep('config'); setOtp(''); setSuccess(''); setError(''); }}
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.25rem 0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'transparent',
                                        color: '#15426d',
                                        border: '1px solid #15426d',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    disabled={loading}
                                >
                                    <i className="fa-light fa-pen"></i> Edit Configuration
                                </button>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="otp">Enter OTP *</label>
                                <input
                                    id="otp"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                    placeholder="Enter 6-digit OTP"
                                    disabled={loading}
                                    maxLength={6}
                                />
                                <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                    Check your email inbox for the OTP
                                </small>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="newPassword">New Password *</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    required
                                    placeholder="Enter new password (min 6 characters)"
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="confirmPassword">Confirm New Password *</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    placeholder="Re-enter new password"
                                    disabled={loading}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className={styles.submitBtn}
                                    style={{ backgroundColor: '#6b7280' }}
                                    onClick={() => { setStep('request'); setOtp(''); setSuccess(''); setError(''); }}
                                    disabled={loading}
                                >
                                    <i className="fa-light fa-arrow-left"></i>
                                    Back
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={loading}>
                                    {loading ? (
                                        <>
                                            <i className="fa-light fa-spinner fa-spin"></i>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-light fa-key"></i>
                                            Reset Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className={styles.footer}>
                        <p>Use the administrative credentials to access this page.</p>
                    </div>
                </div>
            </div>
        </Gatekeeper>
    );
}
