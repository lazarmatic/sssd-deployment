/**
 * Admin Audit Logs Page
 */

import { useState, useEffect } from 'react';
import { AdminRoute, Header, Sidebar, Pagination, Alert } from '../../components/common';
import apiService from '../../services/api';
import { AuditLog } from '../../types';

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [filterAction, setFilterAction] = useState('');
    const [filterActor, setFilterActor] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [page, filterAction, filterActor, filterStatus, startDate, endDate]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await apiService.getAuditLogs(page, 50, {
                action: filterAction || undefined,
                actor: filterActor || undefined,
                status: filterStatus || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });

            setLogs(response.data);
            setTotalPages(response.pagination.pages);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilterAction('');
        setFilterActor('');
        setFilterStatus('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const adminNavLinks = [
        { label: '📊 Dashboard', href: '/admin' },
        { label: '📋 Audit Logs', href: '/admin/audit-logs' },
        { label: '👥 Users', href: '/admin/users' },
        { label: '🔐 Reserved Usernames', href: '/admin/reserved-usernames' },
    ];

    return (
        <AdminRoute>
            <div style={styles.pageLayout}>
                <Header title="Audit Logs" />

                <div style={styles.mainContent}>
                    <Sidebar links={adminNavLinks} isAdmin={true} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

                            <div className="card">
                                <div className="card-header">
                                    🔍 Filter Audit Logs
                                </div>
                                <div className="card-body" style={styles.filterForm}>
                                    <div style={styles.filterGrid}>
                                        <div className="form-group">
                                            <label>Action</label>
                                            <input
                                                type="text"
                                                value={filterAction}
                                                onChange={(e) => setFilterAction(e.target.value)}
                                                placeholder="e.g., login, logout, user_blocked"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Actor/Username</label>
                                            <input
                                                type="text"
                                                value={filterActor}
                                                onChange={(e) => setFilterActor(e.target.value)}
                                                placeholder="Username or actor"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Status</label>
                                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                                <option value="">All</option>
                                                <option value="success">Success</option>
                                                <option value="failure">Failure</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.filterButtons}>
                                        <button className="btn btn-primary" onClick={fetchLogs} disabled={loading}>
                                            {loading ? 'Loading...' : 'Apply Filters'}
                                        </button>
                                        <button className="btn btn-secondary" onClick={resetFilters} disabled={loading}>
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    📋 Audit Log Entries (Page {page} of {totalPages})
                                </div>
                                <div className="card-body">
                                    {loading ? (
                                        <p>Loading logs...</p>
                                    ) : logs.length === 0 ? (
                                        <p>No audit logs found</p>
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Timestamp</th>
                                                    <th>Action</th>
                                                    <th>Actor</th>
                                                    <th>Resource</th>
                                                    <th>Status</th>
                                                    <th>Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {logs.map((log) => (
                                                    <tr key={log.id}>
                                                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                                                        <td><strong>{log.action}</strong></td>
                                                        <td>{log.actor}</td>
                                                        <td>{log.resource}</td>
                                                        <td>
                                                            <span style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                backgroundColor: log.status === 'success' ? '#d4edda' : '#f8d7da',
                                                                color: log.status === 'success' ? '#155724' : '#721c24',
                                                            }}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {log.errorMessage && (
                                                                <span style={{ color: '#dc3545' }}>❌ {log.errorMessage}</span>
                                                            )}
                                                            {log.ipAddress && (
                                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                                    IP: {log.ipAddress}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            )}
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
    filterForm: {
        padding: '20px',
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '15px',
    },
    filterButtons: {
        display: 'flex',
        gap: '10px',
    },
};
