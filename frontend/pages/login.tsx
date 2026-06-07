/**
 * Login Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common';
import Link from 'next/link';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'credentials' | '2fa' | 'totp'>('credentials');
    const [twoFACode, setTwoFACode] = useState('');
    const [userId, setUserId] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [captchaRequired, setCaptchaRequired] = useState(false);
    const [showTrustDevice, setShowTrustDevice] = useState(false);

    const { login, isAuthenticated, refreshUser, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated && !showTrustDevice) {
            router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
        }
    }, [isAuthenticated, showTrustDevice, user, router]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await login(username, email, password, phone);

            if (response.captchaRequired) {
                setCaptchaRequired(true);
                setError('Too many failed attempts. Please verify CAPTCHA.');
            } else if (response.sessionId && !response.accessToken) {
                setUserId(response.userId || '');
                setSessionId(response.sessionId);
                setStep('2fa');
            } else if (response.code === 'EMAIL_NOT_VERIFIED') {
                router.push(`/verify-email?userId=${response.userId}`);
            } else {
                router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Login failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, code: twoFACode, sessionId }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('sessionId', data.sessionId);
                await refreshUser(); // sync auth context
                if (data.showTrustDeviceOption) {
                    setShowTrustDevice(true);
                }
                // let useEffect handle redirect based on role
            } else {
                setError(data.error || '2FA verification failed');
            }
        } catch (err: any) {
            setError(err.message || '2FA verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend2FA = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, sessionId }),
            });

            if (response.ok) {
                setError('');
                alert('2FA code has been resent to your phone');
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to resend 2FA code');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to resend 2FA code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrustDevice = async (trust: boolean) => {
        if (trust) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trusted-devices/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({ deviceName: navigator.userAgent.substring(0, 50) }),
            });
        }
        router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginCard}>
                <h1 style={styles.title}>Security System</h1>
                <h2 style={styles.subtitle}>User Login</h2>

                {error && (
                    <Alert
                        type="danger"
                        message={error}
                        onClose={() => setError('')}
                    />
                )}

                {step === 'credentials' && (
                    <form onSubmit={handleLoginSubmit}>
                        <div className="form-group">
                            <label>Username or Email</label>
                            <input
                                type="text"
                                value={username || email}
                                onChange={(e) => {
                                    if (e.target.value.includes('@')) {
                                        setEmail(e.target.value);
                                        setUsername('');
                                    } else {
                                        setUsername(e.target.value);
                                        setEmail('');
                                    }
                                }}
                                placeholder="Enter username or email"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone (optional)</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{ width: '100%' }}
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                )}

                {step === '2fa' && (
                    <form onSubmit={handle2FASubmit}>
                        <div style={styles.info}>
                            <p>A verification code has been sent to your phone via SMS.</p>
                            <p>The code is valid for 10 minutes.</p>
                        </div>

                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                value={twoFACode}
                                onChange={(e) => setTwoFACode(e.target.value.slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                pattern="\d{6}"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading || twoFACode.length !== 6}
                            style={{ width: '100%' }}
                        >
                            {isLoading ? 'Verifying...' : 'Verify Code'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleResend2FA}
                            disabled={isLoading}
                            style={{ width: '100%', marginTop: '10px' }}
                        >
                            Resend Code
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setStep('credentials');
                                setTwoFACode('');
                                setUserId('');
                                setSessionId('');
                            }}
                            style={{ width: '100%', marginTop: '10px' }}
                        >
                            Back to Login
                        </button>
                    </form>
                )}

                {showTrustDevice && (
                    <div style={styles.info}>
                        <p><strong>Trust this device?</strong></p>
                        <p>Skip 2FA for 10 days on this device.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => handleTrustDevice(true)}
                            style={{ width: '100%', marginBottom: '10px' }}
                        >
                            Yes, trust this device
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleTrustDevice(false)}
                            style={{ width: '100%' }}
                        >
                            No, ask me every time
                        </button>
                    </div>
                )}

                <div style={styles.footer}>
                    <p>Don't have an account? <Link href="/register">Register here</Link></p>
                    <p><Link href="/forgot-password">Forgot password?</Link></p>
                </div>
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
    loginCard: {
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
    info: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px',
        fontSize: '14px',
    },
    footer: {
        textAlign: 'center' as const,
        marginTop: '20px',
        fontSize: '14px',
    },
};
