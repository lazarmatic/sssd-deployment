/**
 * Admin Reserved Usernames Management Page
 */

import { useState, useEffect } from 'react';
import { AdminRoute, Header, Sidebar, Pagination, Alert } from '../../components/common';
import apiService from '../../services/api';
import { ReservedUsername } from '../../types';

export default function AdminReservedUsernamesPage() {
    const [usernames, setUsernames] = useState<ReservedUsername[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');

    // Add form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newReason, setNewReason] = useState('');

    // Edit form
    const [selectedUsername, setSelectedUsername] = useState<ReservedUsername | null>(null);
    const [editReason, setEditReason] = useState('');

    useEffect(() => {
        fetchReservedUsernames();
    }, [page, search]);

    const fetchReservedUsernames = async () => {
        try {
            setLoading(true);
            const response = await apiService.getReservedUsernames(page, 50, search);
            setUsernames(response.data);
            setTotalPages(response.pagination.pages);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch reserved usernames');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUsername = async () => {
        if (!newUsername.trim()) {
            setError('Username is required');
            return;
        }

        try {
            await apiService.addReservedUsername(newUsername, newReason);
            setSuccess(`Username "${newUsername}" has been reserved`);
            setNewUsername('');
            setNewReason('');
            setShowAddForm(false);
            fetchReservedUsernames();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add reserved username');
        }
    };

    const handleDeleteUsername = async (username: string) => {
        if (!confirm(`Are you sure you want to remove "${username}" from reserved usernames?`)) {
            return;
        }

        try {
            await apiService.deleteReservedUsername(username);
            setSuccess(`Username "${username}" has been removed from reserved list`);
            fetchReservedUsernames();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete reserved username');
        }
    };

    const handleEditUsername = async () => {
        if (!selectedUsername) return;

        try {
            await apiService.updateReservedUsername(selectedUsername.username, editReason);
            setSuccess(`Username "${selectedUsername.username}" has been updated`);
            setSelectedUsername(null);
            setEditReason('');
            fetchReservedUsernames();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update reserved username');
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
                <Header title="Reserved Usernames Management" />

                <div style={styles.mainContent}>
                    <Sidebar links={adminNavLinks} isAdmin={true} />

                    <div style={styles.content}>
                        <div className="container">
                            {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
                            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                            <div className="card">
                                <div className="card-header">
                                    🔍 Search Reserved Usernames
                                </div>
                                <div className="card-body" style={styles.filterForm}>
                                    <div style={styles.filterGrid}>
                                        <div className="form-group">
                                            <label>Search</label>
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Search usernames..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setPage(1)}
                                        disabled={loading}
                                        style={{ marginRight: '10px' }}
                                    >
                                        {loading ? 'Loading...' : 'Search'}
                                    </button>

                                    <button
                                        className="btn btn-success"
                                        onClick={() => setShowAddForm(!showAddForm)}
                                        disabled={loading}
                                    >
                                        ➕ Add Reserved Username
                                    </button>
                                </div>
                            </div>

                            {showAddForm && (
                                <div className="card">
                                    <div className="card-header">
                                        ➕ Add New Reserved Username
                                    </div>
                                    <div className="card-body" style={styles.formContent}>
                                        <div className="form-group">
                                            <label>Username</label>
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={(e) => setNewUsername(e.target.value)}
                                                placeholder="Enter username to reserve"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Reason (optional)</label>
                                            <textarea
                                                value={newReason}
                                                onChange={(e) => setNewReason(e.target.value)}
                                                placeholder="Enter reason for reservation..."
                                                style={{ minHeight: '80px' }}
                                            />
                                        </div>

                                        <div style={styles.formButtons}>
                                            <button
                                                className="btn btn-success"
                                                onClick={handleAddUsername}
                                                disabled={loading}
                                            >
                                                Add Username
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setShowAddForm(false);
                                                    setNewUsername('');
                                                    setNewReason('');
                                                }}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="card">
                                <div className="card-header">
                                    🔐 Reserved Usernames List (Page {page} of {totalPages})
                                </div>
                                <div className="card-body">
                                    {loading ? (
                                        <p>Loading usernames...</p>
                                    ) : usernames.length === 0 ? (
                                        <p>No reserved usernames found</p>
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Username</th>
                                                    <th>Reason</th>
                                                    <th>Added</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usernames.map((username) => (
                                                    <tr key={username.id}>
                                                        <td><strong>{username.username}</strong></td>
                                                        <td>{username.reason || '-'}</td>
                                                        <td>{new Date(username.createdAt).toLocaleDateString()}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-primary btn-small"
                                                                onClick={() => {
                                                                    setSelectedUsername(username);
                                                                    setEditReason(username.reason || '');
                                                                }}
                                                                disabled={loading}
                                                                style={{ marginRight: '5px' }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-small"
                                                                onClick={() => handleDeleteUsername(username.username)}
                                                                disabled={loading}
                                                            >
                                                                Delete
                                                            </button>
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

                            {selectedUsername && (
                                <div style={styles.modal}>
                                    <div style={styles.modalContent}>
                                        <h2>Edit Reserved Username</h2>
                                        <p>Editing: <strong>{selectedUsername.username}</strong></p>

                                        <div className="form-group">
                                            <label>Reason</label>
                                            <textarea
                                                value={editReason}
                                                onChange={(e) => setEditReason(e.target.value)}
                                                placeholder="Enter reason for reservation..."
                                                style={{ minHeight: '100px' }}
                                            />
                                        </div>

                                        <div style={styles.modalButtons}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleEditUsername}
                                                disabled={loading}
                                            >
                                                Update
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setSelectedUsername(null);
                                                    setEditReason('');
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
    formContent: {
        padding: '20px',
    },
    formButtons: {
        display: 'flex',
        gap: '10px',
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
