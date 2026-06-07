import { useState } from 'react';
import Link from 'next/link';
import { Alert } from '../components/common';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/password-recovery/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Request failed');
            } else {
                setSuccess(data.message || 'If an account with this email exists, a password reset link will be sent.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Security System</h1>
                <h2 style={styles.subtitle}>Forgot Password</h2>

                {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                {success && <Alert type="success" message={success} />}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <div style={styles.footer}>
                    <p><Link href="/login">Back to Login</Link></p>
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