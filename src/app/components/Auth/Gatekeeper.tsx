'use client';

import { useState } from 'react';
import styles from './Gatekeeper.module.css';

interface GatekeeperProps {
    children: React.ReactNode;
    onVerified?: (password: string) => void;
}

export default function Gatekeeper({ children, onVerified }: GatekeeperProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify-gatekeeper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                setIsAuthenticated(true);
                if (onVerified) {
                    onVerified(password);
                }
            } else {
                setError('Incorrect Access Password');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.box}>
                <div className={styles.icon}>
                    <i className="fa-duotone fa-lock-keyhole"></i>
                </div>
                <h2 className={styles.title}>Restricted Access</h2>
                <p className={styles.description}>
                    Please enter the master password to access this administrative area.
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Master Password"
                        className={styles.input}
                        disabled={loading}
                        autoFocus
                    />
                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? (
                            <>
                                <i className="fa-duotone fa-spinner-third fa-spin"></i>
                                Verifying...
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-unlock"></i>
                                Access
                            </>
                        )}
                    </button>
                </form>

                {error && (
                    <div className={styles.error}>
                        <i className="fa-solid fa-circle-exclamation"></i>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
