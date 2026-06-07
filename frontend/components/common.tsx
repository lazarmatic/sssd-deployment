/**
 * Protected Route Component
 * Ensures user is authenticated before accessing page
 */

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

/**
 * Admin Route Component
 * Ensures user is authenticated and has admin role
 */

export function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.role !== 'admin') {
                router.push('/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'admin') {
        return null;
    }

    return <>{children}</>;
}

/**
 * Alert Component
 */

interface AlertProps {
    type: 'info' | 'success' | 'danger' | 'warning';
    message: string;
    onClose?: () => void;
}

export function Alert({ type, message, onClose }: AlertProps) {
    return (
        <div className={`alert alert-${type}`}>
            <span>{message}</span>
            {onClose && (
                <button className="alert-close" onClick={onClose}>
                    ✕
                </button>
            )}
        </div>
    );
}

/**
 * Loading Component
 */

export function Loading() {
    return (
        <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
        </div>
    );
}

/**
 * Pagination Component
 */

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const pages = [];

    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div className="pagination">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
            >
                Previous
            </button>
            {pages.map((page) => (
                <button
                    key={page}
                    className={currentPage === page ? 'active' : ''}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                Next
            </button>
        </div>
    );
}

/**
 * Header Component
 */

import Link from 'next/link';

interface HeaderProps {
    title: string;
    showLogout?: boolean;
}

export function Header({ title, showLogout = true }: HeaderProps) {
    const { logout, user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <header style={styles.header}>
            <div className="container" style={styles.headerContent}>
                <h1 style={styles.title}>{title}</h1>
                {showLogout && (
                    <div style={styles.userSection}>
                        <span style={styles.username}>{user?.username}</span>
                        <button className="btn btn-secondary btn-small" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}

const styles = {
    header: {
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '20px 0',
        borderBottom: '1px solid #333',
    },
    headerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        margin: 0,
        fontSize: '24px',
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    username: {
        fontWeight: 500,
    },
    sidebar: {
        width: '250px',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #dee2e6',
        minHeight: '100vh',
        padding: '20px 0',
    },
    sidebarContent: {
        padding: '0 15px',
    },
    badge: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center' as const,
        fontSize: '12px',
    },
    navList: {
        listStyle: 'none',
        padding: 0,
    },
    navLink: {
        display: 'block',
        padding: '12px',
        color: '#333',
        textDecoration: 'none',
        borderRadius: '4px',
        transition: 'background-color 0.3s ease',
    },
};