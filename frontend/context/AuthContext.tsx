/**
 * Auth Context
 * Manages authentication state and user information across the app
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import apiService from '../services/api';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, email: string, password: string, phone?: string) => Promise<any>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    clearError: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    const response = await apiService.getCurrentUser();
                    setUser(response.user);
                    setIsAuthenticated(true);
                }
            } catch (err: any) {
                localStorage.clear();
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (username: string, email: string, password: string, phone?: string) => {
        try {
            setError(null);
            setIsLoading(true);

            const response = await apiService.login(username, email, password, phone);

            if (response.accessToken) {
                localStorage.setItem('accessToken', response.accessToken);
                // Fix: guard against undefined before storing
                if (response.refreshToken) {
                    localStorage.setItem('refreshToken', response.refreshToken);
                }
                if (response.sessionId) {
                    localStorage.setItem('sessionId', response.sessionId);
                }

                if (response.user) {
                    setUser(response.user);
                    setIsAuthenticated(true);
                }
            }

            return response;
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Login failed';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            if (sessionId) {
                await apiService.logout(sessionId);
            }
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.clear();
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const refreshUser = async () => {
        try {
            const response = await apiService.getCurrentUser();
            setUser(response.user);
            setIsAuthenticated(true); // ← key fix: mark as authenticated
        } catch (err: any) {
            console.error('Error refreshing user:', err);
            setError(err.response?.data?.error || 'Failed to refresh user');
        }
    };

    const clearError = () => setError(null);

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        setUser,
        clearError,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}