/**
 * Admin Users Management Page
 */

import { useState, useEffect } from 'react';
import { AdminRoute, Header, Sidebar, Pagination, Alert } from '../../components/common';
import apiService from '../../services/api';
import { User } from '../../types';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [blockedFilter, setBlockedFilter] = useState('');

    // Block/Unblock modal
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [blockReason, setBlockReason] = useState('');
    const [showBlockModal, setShowBlockModal] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [page, search, blockedFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiService.getAllUsers(
                page,
                50,
                search,
                blockedFilter === 'true' ? true : blockedFilter === 'false' ? false : undefined
            );

            setUsers(response.data);
            setTotalPages(response.pagination.pages);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleBlockUser = async () => {
        if (!selectedUser) return;

        try {
            await apiService.blockUser(selectedUser.id, blockReason);
            setSuccess(`User ${selectedUser.username} has been blocked`);
            setShowBlockModal(false);
            setBlockReason('');
            setSelectedUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to block user');
        }
    };

    const handleUnblockUser = async (userId: string) => {
        try {
            await apiService.unblockUser(userId);
            setSuccess('User has been unblocked');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to unblock user');
        }
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
                <Header title="User Management" />

                <div style={styles.mainContent}>
                    <Sidebar links={adminNavLinks} isAdmin={true} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                            <div className="card">
                                <div className="card-header">
                                    🔍 Filter Users
                                </div>
                                <div className="card-body" style={styles.filterForm}>
                                    <div style={styles.filterGrid}>
                                        <div className="form-group">
                                            <label>Search (Username or Email)</label>
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Search users..."
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Filter by Status</label>
                                            <select value={blockedFilter} onChange={(e) => setBlockedFilter(e.target.value)}>
                                                <option value="">All Users</option>
                                                <option value="false">Active Users</option>
                                                <option value="true">Blocked Users</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button className="btn btn-primary" onClick={fetchUsers} disabled={loading}>
                                        {loading ? 'Loading...' : 'Search'}
                                    </button>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    👥 Users List (Page {page} of {totalPages})
                                </div>
                                <div className="card-body">
                                    {loading ? (
                                        <p>Loading users...</p>
                                    ) : users.length === 0 ? (
                                        <p>No users found</p>
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Username</th>
                                                    <th>Email</th>
                                                    <th>Phone</th>
                                                    <th>Status</th>
                                                    <th>2FA</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((user) => (
                                                    <tr key={user.id}>
                                                        <td><strong>{user.username}</strong></td>
                                                        <td>{user.email}</td>
                                                        <td>{user.phone}</td>
                                                        <td>
                                                            <span style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                backgroundColor: user.blocked ? '#f8d7da' : '#d4edda',
                                                                color: user.blocked ? '#721c24' : '#155724',
                                                            }}>
                                                                {user.blocked ? '🚫 Blocked' : '✅ Active'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {user.totpEnabled ? (
                                                                <span style={{ color: '#28a745' }}>✅ TOTP</span>
                                                            ) : (
                                                                <span style={{ color: '#666' }}>SMS Only</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {user.blocked ? (
                                                                <button
                                                                    className="btn btn-success btn-small"
                                                                    onClick={() => handleUnblockUser(user.id)}
                                                                    disabled={loading}
                                                                >
                                                                    Unblock
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="btn btn-danger btn-small"
                                                                    onClick={() => {
                                                                        setSelectedUser(user);
                                                                        setShowBlockModal(true);
                                                                    }}
                                                                    disabled={loading}
                                                                >
                                                                    Block
                                                                </button>
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

                            {showBlockModal && selectedUser && (
                                <div style={styles.modal}>
                                    <div style={styles.modalContent}>
                                        <h2>Block User</h2>
                                        <p>Are you sure you want to block user <strong>{selectedUser.username}</strong>?</p>

                                        <div className="form-group">
                                            <label>Reason for blocking</label>
                                            <textarea
                                                value={blockReason}
                                                onChange={(e) => setBlockReason(e.target.value)}
                                                placeholder="Enter reason for blocking this user..."
                                                style={{ minHeight: '100px' }}
                                            />
                                        </div>

                                        <div style={styles.modalButtons}>
                                            <button
                                                className="btn btn-danger"
                                                onClick={handleBlockUser}
                                                disabled={loading}
                                            >
                                                Confirm Block
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setShowBlockModal(false);
                                                    setSelectedUser(null);
                                                    setBlockReason('');
                                                }}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
    modal: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '90%',
    },
    modalButtons: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
    },
};
