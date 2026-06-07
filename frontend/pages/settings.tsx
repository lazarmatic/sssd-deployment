/**
 * Settings Page
 */

import { useState } from 'react';
import { ProtectedRoute, Header, Sidebar, Alert } from '../components/common';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
    const { user } = useAuth();
    const [error, setError] = useState('');

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
                <Header title="Security Settings" />

                <div style={styles.mainContent}>
                    <Sidebar links={navLinks} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

                            <div className="card">
                                <div className="card-header">
                                    🔒 Your Security Settings
                                </div>
                                <div className="card-body" style={styles.settingsContent}>
                                    <div style={styles.settingItem}>
                                        <h3>📧 Email Address</h3>
                                        <p><strong>Email:</strong> {user?.email}</p>
                                        <p style={styles.status}>
                                            {user?.emailVerified ? '✅ Verified' : '⚠️ Not Verified'}
                                        </p>
                                    </div>

                                    <hr />

                                    <div style={styles.settingItem}>
                                        <h3>📱 Phone Number</h3>
                                        <p><strong>Phone:</strong> {user?.phone}</p>
                                        <p style={styles.info}>
                                            This phone number is used for SMS-based 2FA verification.
                                        </p>
                                    </div>

                                    <hr />

                                    <div style={styles.settingItem}>
                                        <h3>🔐 Two-Factor Authentication</h3>
                                        <p>
                                            <strong>2FA Status:</strong> {user?.twoFactorRequired ? 'Required' : 'Optional'}
                                        </p>
                                        <p>
                                            <strong>TOTP Status:</strong> {user?.totpEnabled ? '✅ Enabled' : '❌ Disabled'}
                                        </p>
                                        <div style={styles.info}>
                                            <p><strong>SMS 2FA:</strong> ✅ Always Enabled</p>
                                            <p>You receive a 6-digit code via SMS whenever you log in.</p>
                                        </div>
                                        <a href="/2fa" className="btn btn-primary btn-small">
                                            Manage 2FA Settings
                                        </a>
                                    </div>

                                    <hr />

                                    <div style={styles.settingItem}>
                                        <h3>🔄 Password</h3>
                                        <p>For your security, we don't display your password.</p>
                                        <p style={styles.info}>
                                            Change your password regularly to keep your account secure.
                                        </p>
                                        <a href="/change-password" className="btn btn-primary btn-small">
                                            Change Password
                                        </a>
                                    </div>

                                    <hr />

                                    <div style={styles.settingItem}>
                                        <h3>📝 Account Information</h3>
                                        <p><strong>Username:</strong> {user?.username}</p>
                                        <p><strong>Account Status:</strong> {user?.blocked ? '🚫 Blocked' : '✅ Active'}</p>
                                        {user?.blocked && (
                                            <p style={styles.warning}>
                                                Your account has been blocked. Please contact support.
                                            </p>
                                        )}
                                        <p style={styles.info}>
                                            <strong>Member Since:</strong> {new Date(user?.createdAt || '').toLocaleDateString()}
                                        </p>
                                    </div>

                                    <hr />

                                    <div style={styles.securityTips}>
                                        <h3>🔒 Security Tips</h3>
                                        <ul>
                                            <li>✓ Use a strong, unique password</li>
                                            <li>✓ Enable 2FA for additional protection</li>
                                            <li>✓ Review active sessions regularly</li>
                                            <li>✓ Keep your email and phone updated</li>
                                            <li>✓ Review audit logs for suspicious activity</li>
                                            <li>✓ Never share your credentials</li>
                                        </ul>
                                    </div>
                                </div>
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
    settingsContent: {
        padding: '20px',
    },
    settingItem: {
        marginBottom: '20px',
        paddingBottom: '20px',
    },
    status: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '4px',
        display: 'inline-block',
        marginTop: '10px',
    },
    info: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '10px',
        borderRadius: '4px',
        marginTop: '10px',
        fontSize: '14px',
    },
    warning: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '10px',
        borderRadius: '4px',
        marginTop: '10px',
    },
    securityTips: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '15px',
        borderRadius: '4px',
        marginTop: '20px',
    },
};
