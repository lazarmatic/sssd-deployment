/**
 * Admin Dashboard Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdminRoute, Header, Sidebar, Loading } from '../../components/common';
import apiService from '../../services/api';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await apiService.getAuditStats();
            setStats(response.stats);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const adminNavLinks = [
        { label: '📊 Dashboard', href: '/admin' },
        { label: '📋 Audit Logs', href: '/admin/audit-logs' },
        { label: '👥 Users', href: '/admin/users' },
        { label: '🔐 Reserved Usernames', href: '/admin/reserved-usernames' },
    ];

    if (loading) return <Loading />;

    return (
        <AdminRoute>
            <div style={styles.pageLayout}>
                <Header title="Admin Dashboard" />

                <div style={styles.mainContent}>
                    <Sidebar links={adminNavLinks} isAdmin={true} />

                    <div style={styles.content}>
                        <div className="container">
                            <div className="card">
                                <div className="card-header">
                                    👋 Welcome, Administrator {user?.username}
                                </div>
                                <div className="card-body" style={styles.greeting}>
                                    <p>You have full access to the system administration dashboard.</p>
                                </div>
                            </div>

                            <div style={styles.statsGrid}>
                                {stats && (
                                    <>
                                        <div className="card" style={styles.statCard}>
                                            <div style={styles.statValue}>{stats.failedLogins || 0}</div>
                                            <div style={styles.statLabel}>Failed Logins (24h)</div>
                                        </div>

                                        <div className="card" style={styles.statCard}>
                                            <div style={styles.statValue}>{stats.successfulLogins || 0}</div>
                                            <div style={styles.statLabel}>Successful Logins (24h)</div>
                                        </div>

                                        <div className="card" style={styles.statCard}>
                                            <div style={styles.statValue}>{stats.totalEvents || 0}</div>
                                            <div style={styles.statLabel}>Total Events (24h)</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    🔧 Admin Functions
                                </div>
                                <div className="card-body" style={styles.functions}>
                                    <div style={styles.functionItem}>
                                        <h3>📋 Audit Logs</h3>
                                        <p>View detailed audit logs with advanced filtering options.</p>
                                        <Link href="/admin/audit-logs" className="btn btn-primary btn-small">
                                            View Logs
                                        </Link>
                                    </div>

                                    <div style={styles.functionItem}>
                                        <h3>👥 User Management</h3>
                                        <p>Manage users, view details, and block/unblock accounts.</p>
                                        <Link href="/admin/users" className="btn btn-primary btn-small">
                                            Manage Users
                                        </Link>
                                    </div>

                                    <div style={styles.functionItem}>
                                        <h3>🔐 Reserved Usernames</h3>
                                        <p>Manage reserved usernames that cannot be registered.</p>
                                        <Link href="/admin/reserved-usernames" className="btn btn-primary btn-small">
                                            Manage Usernames
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminRoute>
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
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        margin: '20px 0',
    },
    statCard: {
        textAlign: 'center' as const,
        padding: '30px 20px!',
    },
    statValue: {
        fontSize: '32px',
        fontWeight: 'bold' as const,
        color: '#007bff',
        marginBottom: '10px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#666',
    },
    functions: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '20px',
    },
    functionItem: {
        borderLeft: '4px solid #dc3545',
        paddingLeft: '20px',
    },
};
