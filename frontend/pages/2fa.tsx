/**
 * 2FA Settings Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute, Header, Sidebar, Alert } from '../components/common';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import QRCode from 'qrcode.react';

export default function TwoFASettingsPage() {
    const { user, refreshUser } = useAuth();
    const router = useRouter();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // TOTP Setup
    const [showTOTPSetup, setShowTOTPSetup] = useState(false);
    const [totpSecret, setTotpSecret] = useState('');
    const [totpQRCode, setTotpQRCode] = useState('');
    const [totpToken, setTotpToken] = useState('');

    const handleSetupTOTP = async () => {
        try {
            setLoading(true);
            const response = await apiService.setupTOTP(user?.id);
            setTotpSecret(response.secret);
            setTotpQRCode(response.qrCode);
            setShowTOTPSetup(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to setup TOTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTOTP = async () => {
        if (!totpToken || totpToken.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        try {
            setLoading(true);
            const response = await apiService.verifyTOTP(totpToken, user?.id);
            setSuccess(response.message);
            setShowTOTPSetup(false);
            setTotpToken('');
            await refreshUser();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to verify TOTP');
        } finally {
            setLoading(false);
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
                <Header title="2FA Settings" />

                <div style={styles.mainContent}>
                    <Sidebar links={navLinks} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                            <div className="card">
                                <div className="card-header">
                                    🔐 Two-Factor Authentication
                                </div>
                                <div className="card-body" style={styles.content2FA}>
                                    <div style={styles.methodItem}>
                                        <h3>📱 SMS Authentication (SMS)</h3>
                                        <p>Receive verification codes via SMS to your registered phone number.</p>
                                        <p><strong>Status:</strong> ✅ Always Enabled</p>
                                        <p style={styles.info}>
                                            This is your primary 2FA method and is always enabled for security.
                                        </p>
                                    </div>

                                    <hr />

                                    <div style={styles.methodItem}>
                                        <h3>🔑 Time-Based One-Time Password (TOTP)</h3>
                                        <p>Use an authenticator app (Google Authenticator, Microsoft Authenticator, etc.) for additional security.</p>
                                        <p>
                                            <strong>Status:</strong> {user?.totpEnabled ? '✅ Enabled' : '❌ Disabled'}
                                        </p>

                                        {!user?.totpEnabled ? (
                                            <>
                                                <button
                                                    className="btn btn-success"
                                                    onClick={handleSetupTOTP}
                                                    disabled={loading}
                                                >
                                                    Enable TOTP
                                                </button>

                                                {showTOTPSetup && (
                                                    <div style={styles.setupSection}>
                                                        <h4>Step 1: Scan QR Code</h4>
                                                        <p>Scan this QR code with your authenticator app:</p>
                                                        {totpQRCode && (
                                                            <div style={styles.qrCode}>
                                                                <img src={totpQRCode} alt="TOTP QR Code" width={200} height={200} />
                                                            </div>
                                                        )}

                                                        <h4 style={{ marginTop: '20px' }}>Step 2: Manual Entry (if scanning fails)</h4>
                                                        <p>Secret Key: <code>{totpSecret}</code></p>

                                                        <h4 style={{ marginTop: '20px' }}>Step 3: Verify Code</h4>
                                                        <p>Enter a 6-digit code from your authenticator app:</p>
                                                        <div className="form-group">
                                                            <input
                                                                type="text"
                                                                value={totpToken}
                                                                onChange={(e) => setTotpToken(e.target.value.slice(0, 6))}
                                                                placeholder="000000"
                                                                maxLength={6}
                                                                pattern="\d{6}"
                                                            />
                                                        </div>

                                                        <div style={styles.setupButtons}>
                                                            <button
                                                                className="btn btn-success"
                                                                onClick={handleVerifyTOTP}
                                                                disabled={loading || totpToken.length !== 6}
                                                            >
                                                                Verify & Enable
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary"
                                                                onClick={() => {
                                                                    setShowTOTPSetup(false);
                                                                    setTotpSecret('');
                                                                    setTotpQRCode('');
                                                                    setTotpToken('');
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <p style={styles.success}>
                                                ✅ TOTP is enabled. You can now use your authenticator app for login.
                                            </p>
                                        )}
                                    </div>

                                    <hr />

                                    <div style={styles.info2}>
                                        <h4>🔒 Security Reminder</h4>
                                        <ul>
                                            <li>At least one 2FA method must always be enabled</li>
                                            <li>SMS 2FA is always active</li>
                                            <li>TOTP provides additional security with an authenticator app</li>
                                            <li>Keep your authenticator backup codes in a safe place</li>
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
    content2FA: {
        padding: '20px',
    },
    methodItem: {
        marginBottom: '20px',
        paddingBottom: '20px',
    },
    info: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '12px',
        borderRadius: '4px',
        marginTop: '10px',
    },
    success: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '12px',
        borderRadius: '4px',
    },
    setupSection: {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '4px',
        marginTop: '20px',
        border: '1px solid #dee2e6',
    },
    qrCode: {
        textAlign: 'center' as const,
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '4px',
    },
    setupButtons: {
        display: 'flex',
        gap: '10px',
        marginTop: '15px',
    },
    info2: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '15px',
        borderRadius: '4px',
        marginTop: '20px',
    },
};
