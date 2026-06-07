import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Alert } from '../components/common';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (router.query.token) {
            setToken(router.query.token as string);
        }
    }, [router.query]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/password-recovery/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password, confirmPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Reset failed');
            } else {
                setSuccess('Password reset successfully! You can now log in with your new password.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.subtitle}>Invalid Reset Link</h2>
                    <Alert type="danger" message="No reset token found. Please request a new password reset link." />
                    <div style={styles.footer}>
                        <Link href="/forgot-password">Request new reset link</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Security System</h1>
                <h2 style={styles.subtitle}>Reset Password</h2>

                {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                {success && (
                    <>
                        <Alert type="success" message={success} />
                        <div style={styles.footer}>
                            <Link href="/login">Go to Login</Link>
                        </div>
                    </>
                )}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min 12 chars, upper, lower, number, special"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your new password"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {!success && (
                    <div style={styles.footer}>
                        <p><Link href="/login">Back to Login</Link></p>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
    },
    card: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
    },
    title: {
        textAlign: 'center' as const,
        marginBottom: '10px',
        color: '#333',
    },
    subtitle: {
        textAlign: 'center' as const,
        marginBottom: '30px',
        color: '#666',
        fontSize: '18px',
    },
    footer: {
        textAlign: 'center' as const,
        marginTop: '20px',
        fontSize: '14px',
    },
};