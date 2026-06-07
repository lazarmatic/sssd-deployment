/**
 * User Dashboard Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute, Header, Sidebar, Alert } from '../components/common';
import Link from 'next/link';
import apiService from '../services/api';
import { Session } from '../types';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeSessions, setActiveSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchActiveSessions();
    }, []);

    const fetchActiveSessions = async () => {
        try {
            const response = await apiService.getActiveSessions();
            setActiveSessions(response.sessions || []);
        } catch (err: any) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (err: any) {
            setError('Logout failed');
        }
    };

    const handleLogoutSession = async (sessionId: string) => {
        try {
            await apiService.logout(sessionId);
            setSuccess('Session logged out successfully');
            fetchActiveSessions();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to logout session');
        }
    };

    const navLinks = [
        { label: '🏠 Dashboard', href: '/dashboard' },
        { label: '🔒 Security Settings', href: '/settings' },
        { label: '🔑 2FA Settings', href: '/2fa' },
        { label: '🔄 Change Password', href: '/change-password' },
        { label: '📱 Trusted Devices', href: '/trusted-devices' },
    ];

    return (
        <ProtectedRoute>
            <div style={styles.pageLayout}>
                <Header title="User Dashboard" showLogout={true} />

                <div style={styles.mainContent}>
                    <Sidebar links={navLinks} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                            <div className="card">
                                <div className="card-header">
                                    👋 Welcome, {user?.username}!
                                </div>
                                <div className="card-body" style={styles.greeting}>
                                    <p>
                                        Welcome to your secure dashboard. Your account is protected with multiple security features.
                                    </p>
                                    <p>
                                        <strong>Email:</strong> {user?.email}
                                    </p>
                                    <p>
                                        <strong>Phone:</strong> {user?.phone}
                                    </p>
                                    <p>
                                        <strong>2FA Status:</strong> {user?.totpEnabled ? '✅ TOTP Enabled' : '⚠️ Basic 2FA Only'}
                                    </p>
                                    {user?.blocked && (
                                        <Alert type="danger" message="⚠️ Your account has been blocked. Please contact support." />
                                    )}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    🔐 Security Features
                                </div>
                                <div className="card-body" style={styles.features}>
                                    <div style={styles.featureItem}>
                                        <h3>🔒 Change Password</h3>
                                        <p>Update your account password regularly to maintain security.</p>
                                        <Link href="/change-password" className="btn btn-primary btn-small">
                                            Change Password
                                        </Link>
                                    </div>

                                    <div style={styles.featureItem}>
                                        <h3>🔑 2FA Settings</h3>
                                        <p>Manage your two-factor authentication methods (SMS and TOTP).</p>
                                        <Link href="/2fa" className="btn btn-primary btn-small">
                                            Manage 2FA
                                        </Link>
                                    </div>

                                    <div style={styles.featureItem}>
                                        <h3>📱 Trusted Devices</h3>
                                        <p>View and manage trusted devices for your account.</p>
                                        <Link href="/trusted-devices" className="btn btn-primary btn-small">
                                            View Devices
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    🔄 Active Sessions
                                </div>
                                <div className="card-body">
                                    {loading ? (
                                        <p>Loading sessions...</p>
                                    ) : activeSessions.length === 0 ? (
                                        <p>No active sessions</p>
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>IP Address</th>
                                                    <th>Device</th>
                                                    <th>Created</th>
                                                    <th>Expires</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeSessions.map((session) => (
                                                    <tr key={session.id}>
                                                        <td>{session.ipAddress}</td>
                                                        <td style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                                            {session.userAgent.substring(0, 50)}...
                                                        </td>
                                                        <td>{new Date(session.createdAt).toLocaleString()}</td>
                                                        <td>
                                                            {session.isExpired ? (
                                                                <span style={{ color: '#dc3545' }}>Expired</span>
                                                            ) : (
                                                                new Date(session.accessTokenExpiresAt).toLocaleString()
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-danger btn-small"
                                                                onClick={() => handleLogoutSession(session.id)}
                                                                disabled={loading}
                                                            >
                                                                Logout
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div style={styles.actions}>
                                <button className="btn btn-danger" onClick={handleLogout}>
                                    Logout All Sessions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

const styles = {
    pageLayout: {
        display: 'flex',
        flexDirection: 'column' as const,
        minHeight: '100vh',
    },
    mainContent: {
        display: 'flex',
        flex: 1,
    },
    content: {
        flex: 1,
        padding: '20px',
    },
    greeting: {
        padding: '20px',
    },
    features: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '20px',
    },
    featureItem: {
        borderLeft: '4px solid #007bff',
        paddingLeft: '20px',
    },
    actions: {
        textAlign: 'center' as const,
        marginTop: '30px',
        paddingBottom: '20px',
    },
};
