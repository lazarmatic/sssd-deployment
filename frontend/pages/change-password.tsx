/**
 * Change Password Page
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute, Header, Sidebar, Alert } from '../components/common';
import apiService from '../services/api';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordRequirements, setPasswordRequirements] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    });

    const validatePassword = (password: string) => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        };
        setPasswordRequirements(requirements);
        return Object.values(requirements).every(r => r);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!currentPassword) {
            setError('Current password is required');
            return;
        }

        if (!newPassword) {
            setError('New password is required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!validatePassword(newPassword)) {
            setError('Password does not meet security requirements');
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from current password');
            return;
        }

        try {
            setLoading(true);
            const response = await apiService.changePassword(currentPassword, newPassword);
            setSuccess(response.message || 'Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to change password');
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
                <Header title="Change Password" />

                <div style={styles.mainContent}>
                    <Sidebar links={navLinks} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                            <div className="card">
                                <div className="card-header">
                                    🔄 Change Your Password
                                </div>
                                <div className="card-body" style={styles.formContent}>
                                    <form onSubmit={handleChangePassword}>
                                        <div className="form-group">
                                            <label>Current Password</label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Enter your current password"
                                                disabled={loading}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => {
                                                    setNewPassword(e.target.value);
                                                    validatePassword(e.target.value);
                                                }}
                                                placeholder="Enter your new password"
                                                disabled={loading}
                                            />

                                            <div style={styles.requirements}>
                                                <p><strong>Password Requirements:</strong></p>
                                                <ul>
                                                    <li style={passwordRequirements.length ? styles.requirementMet : styles.requirementNotMet}>
                                                        ✓ At least 8 characters
                                                    </li>
                                                    <li style={passwordRequirements.uppercase ? styles.requirementMet : styles.requirementNotMet}>
                                                        ✓ At least 1 uppercase letter (A-Z)
                                                    </li>
                                                    <li style={passwordRequirements.lowercase ? styles.requirementMet : styles.requirementNotMet}>
                                                        ✓ At least 1 lowercase letter (a-z)
                                                    </li>
                                                    <li style={passwordRequirements.number ? styles.requirementMet : styles.requirementNotMet}>
                                                        ✓ At least 1 number (0-9)
                                                    </li>
                                                    <li style={passwordRequirements.special ? styles.requirementMet : styles.requirementNotMet}>
                                                        ✓ At least 1 special character (!@#$%^&*)
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter your new password"
                                                disabled={loading}
                                            />
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <p style={styles.error}>Passwords do not match</p>
                                            )}
                                            {confirmPassword && newPassword === confirmPassword && (
                                                <p style={styles.success}>Passwords match</p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                            style={{ width: '100%' }}
                                        >
                                            {loading ? 'Changing Password...' : 'Change Password'}
                                        </button>
                                    </form>

                                    <div style={styles.info}>
                                        <h4>🔒 Security Tips</h4>
                                        <ul>
                                            <li>Choose a strong, unique password</li>
                                            <li>Don't reuse passwords from other websites</li>
                                            <li>Never share your password with anyone</li>
                                            <li>Change your password regularly (every 90 days recommended)</li>
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
    formContent: {
        padding: '20px',
        maxWidth: '500px',
    },
    requirements: {
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '4px',
        marginTop: '10px',
        fontSize: '14px',
    },
    requirementMet: {
        color: '#28a745',
    },
    requirementNotMet: {
        color: '#dc3545',
    },
    error: {
        color: '#dc3545',
        fontSize: '13px',
        marginTop: '5px',
    },
    success: {
        color: '#28a745',
        fontSize: '13px',
        marginTop: '5px',
    },
    info: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '15px',
        borderRadius: '4px',
        marginTop: '20px',
    },
};
