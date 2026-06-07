/**
 * Trusted Devices Page
 */

import { useState, useEffect } from 'react';
import { ProtectedRoute, Header, Sidebar, Alert, Loading } from '../components/common';
import apiService from '../services/api';
import { TrustedDevice } from '../types';

export default function TrustedDevicesPage() {
    const [devices, setDevices] = useState<TrustedDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            // This would need the user ID, but for demo purposes we can call a general endpoint
            // In production, this would be: GET /session/active for active sessions
            const response = await apiService.getActiveSessions();
            // Convert sessions to trusted devices format for display
            const devices = response.sessions?.map((session: any) => ({
                id: session.id,
                deviceName: session.userAgent.substring(0, 50),
                userAgent: session.userAgent,
                ipAddress: session.ipAddress,
                createdAt: session.createdAt,
                lastUsedAt: session.createdAt,
                expiresAt: session.accessTokenExpiresAt,
                isExpired: new Date(session.accessTokenExpiresAt) < new Date(),
                isRevoked: false,
            })) || [];
            setDevices(devices);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch devices');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeDevice = async (deviceId: string) => {
        if (!confirm('Are you sure you want to revoke this device? You will need to log in again from this device.')) {
            return;
        }

        try {
            await apiService.revokeTrustedDevice(deviceId);
            setSuccess('Device has been revoked');
            fetchDevices();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to revoke device');
        }
    };

    const navLinks = [
        { label: '🏠 Dashboard', href: '/dashboard' },
        { label: '🔒 Security Settings', href: '/settings' },
        { label: '🔑 2FA Settings', href: '/2fa' },
        { label: '🔄 Change Password', href: '/change-password' },
        { label: '📱 Trusted Devices', href: '/trusted-devices' },
    ];

    if (loading) return <Loading />;

    return (
        <ProtectedRoute>
            <div style={styles.pageLayout}>
                <Header title="Trusted Devices" />

                <div style={styles.mainContent}>
                    <Sidebar links={navLinks} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                            <div className="card">
                                <div className="card-header">
                                    📱 Active Sessions & Trusted Devices
                                </div>
                                <div className="card-body">
                                    {devices.length === 0 ? (
                                        <p>No active sessions</p>
                                    ) : (
                                        <>
                                            <p style={styles.info}>
                                                Below are all your active sessions. You can revoke any session to log out from that device.
                                            </p>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Device</th>
                                                        <th>IP Address</th>
                                                        <th>Created</th>
                                                        <th>Expires</th>
                                                        <th>Status</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {devices.map((device) => (
                                                        <tr key={device.id}>
                                                            <td>
                                                                <strong>{device.userAgent.substring(0, 40)}...</strong>
                                                            </td>
                                                            <td>{device.ipAddress}</td>
                                                            <td>{new Date(device.createdAt).toLocaleString()}</td>
                                                            <td>
                                                                {device.isExpired ? (
                                                                    <span style={{ color: '#dc3545' }}>Expired</span>
                                                                ) : (
                                                                    new Date(device.expiresAt).toLocaleString()
                                                                )}
                                                            </td>
                                                            <td>
                                                                <span style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '12px',
                                                                    backgroundColor: device.isExpired ? '#f8d7da' : '#d4edda',
                                                                    color: device.isExpired ? '#721c24' : '#155724',
                                                                }}>
                                                                    {device.isExpired ? '❌ Expired' : '✅ Active'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-danger btn-small"
                                                                    onClick={() => handleRevokeDevice(device.id)}
                                                                    disabled={loading}
                                                                >
                                                                    Revoke
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    ℹ️ How Trusted Devices Work
                                </div>
                                <div className="card-body" style={styles.infoContent}>
                                    <h4>🔐 Session Management</h4>
                                    <ul>
                                        <li>Each device creates a new session when you log in</li>
                                        <li>Sessions expire after a set period of inactivity or time</li>
                                        <li>You can manually revoke any session at any time</li>
                                        <li>Revoking a session will log you out from that device</li>
                                    </ul>

                                    <h4 style={{ marginTop: '20px' }}>🛡️ Security Tips</h4>
                                    <ul>
                                        <li>Regularly review your active sessions</li>
                                        <li>Revoke sessions from devices you don't recognize</li>
                                        <li>Use strong passwords on all devices</li>
                                        <li>Enable 2FA for additional protection</li>
                                        <li>Logout when using public computers</li>
                                        <li>Never share your session tokens</li>
                                    </ul>

                                    <h4 style={{ marginTop: '20px' }}>❓ What to do if compromised</h4>
                                    <ul>
                                        <li>Revoke all sessions immediately</li>
                                        <li>Change your password right away</li>
                                        <li>Review your audit logs for suspicious activity</li>
                                        <li>Contact support if needed</li>
                                    </ul>
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
    info: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '15px',
    },
    infoContent: {
        padding: '20px',
    },
};
