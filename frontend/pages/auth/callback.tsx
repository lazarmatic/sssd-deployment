/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers after successful login
 * Stores tokens and redirects to dashboard
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallbackPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!router.isReady) return;

        const { accessToken, refreshToken, sessionId, isNew } = router.query;

        if (accessToken && refreshToken && sessionId) {
            // Store tokens
            localStorage.setItem('accessToken', accessToken as string);
            localStorage.setItem('refreshToken', refreshToken as string);
            localStorage.setItem('sessionId', sessionId as string);

            // Refresh user context then redirect
            refreshUser().then(() => {
                router.push('/dashboard');
            }).catch(() => {
                router.push('/dashboard');
            });
        } else {
            setError('OAuth login failed. Missing tokens.');
            setTimeout(() => router.push('/login'), 2000);
        }
    }, [router.isReady, router.query]);

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={{ color: '#dc3545' }}>Login Failed</h2>
                    <p>{error}</p>
                    <p>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Logging you in...</h2>
                <p>Please wait while we complete your login.</p>
                <div style={styles.spinner}></div>
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
    },
    card: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center' as const,
        maxWidth: '400px',
        width: '100%',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '20px auto',
    },
};