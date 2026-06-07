/**
 * API Service
 * Handles all backend API communication
 */

import axios, { AxiosInstance } from 'axios';
import { User, AuthResponse, AuditLog, AuditLogsResponse, ReservedUsername, Session } from '../types';

class ApiService {
    private api: AxiosInstance;
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

        this.api = axios.create({
            baseURL: this.apiUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor to include auth token
        this.api.interceptors.request.use(
            (config) => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor to handle token refresh
        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
                        const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null;

                        if (refreshToken && sessionId) {
                            const response = await this.api.post('/session/refresh', {
                                refreshToken,
                                sessionId,
                            });

                            if (typeof window !== 'undefined') {
                                localStorage.setItem('accessToken', response.data.accessToken);
                            }

                            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
                            return this.api(originalRequest);
                        }
                    } catch (refreshError) {
                        // Clear auth and redirect to login
                        if (typeof window !== 'undefined') {
                            localStorage.clear();
                            window.location.href = '/login';
                        }
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // ===== Authentication Endpoints =====

    async login(username: string, email: string, password: string, phone?: string, captchaToken?: string): Promise<AuthResponse> {
        const response = await this.api.post('/auth/login', {
            username: username || undefined,
            email: email || undefined,
            password,
            phone,
            captchaToken,
        });
        return response.data;
    }

    async verify2FA(userId: string, code: string, sessionId: string): Promise<AuthResponse> {
        const response = await this.api.post('/auth/2fa', {
            userId,
            code,
            sessionId,
        });
        return response.data;
    }

    async resend2FACode(userId: string, sessionId: string): Promise<any> {
        const response = await this.api.post('/auth/2fa/resend', {
            userId,
            sessionId,
        });
        return response.data;
    }

    async register(
        username: string,
        email: string,
        password: string,
        phone: string
    ): Promise<any> {
        const response = await this.api.post('/register', {
            username,
            email,
            password,
            phone,
        });
        return response.data;
    }

    async verifyEmail(token: string): Promise<any> {
        const response = await this.api.get(`/verify-email?token=${token}`);
        return response.data;
    }

    async resendVerificationEmail(email: string): Promise<any> {
        const response = await this.api.post('/resend-verification-email', { email });
        return response.data;
    }

    async getCurrentUser(): Promise<{ user: User }> {
        const response = await this.api.get('/auth/me');
        return response.data;
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<any> {
        const response = await this.api.post('/auth/password-change', {
            currentPassword,
            newPassword,
            confirmPassword: newPassword,
        });
        return response.data;
    }

    async setupTOTP(userId?: string): Promise<any> {
        const response = await this.api.post('/auth/totp/setup', { userId });
        return response.data;
    }

    async verifyTOTP(totpToken: string, userId?: string): Promise<any> {
        const response = await this.api.post('/auth/totp/verify', {
            token: totpToken,  // ← backend expects "token"
            userId,
        });
        return response.data;
    }

    // ===== Session Endpoints =====

    async logout(sessionId: string): Promise<any> {
        const response = await this.api.post('/session/logout', { sessionId });
        return response.data;
    }

    async logoutAll(): Promise<any> {
        const response = await this.api.post('/session/logout-all', {});
        return response.data;
    }

    async getActiveSessions(): Promise<{ sessions: Session[] }> {
        const response = await this.api.get('/session/active');
        return response.data;
    }

    // ===== Admin Endpoints =====

    async getAuditLogs(
        page: number = 1,
        limit: number = 50,
        filters?: any
    ): Promise<AuditLogsResponse> {
        const response = await this.api.get('/admin/audit-logs', {
            params: {
                page,
                limit,
                ...filters,
            },
        });
        return response.data;
    }

    async getAuditStats(): Promise<any> {
        const response = await this.api.get('/admin/audit-logs/stats');
        return response.data;
    }

    async getAllUsers(page: number = 1, limit: number = 50, search?: string, blocked?: boolean): Promise<any> {
        const response = await this.api.get('/admin/users', {
            params: { page, limit, search, blocked },
        });
        return response.data;
    }

    async blockUser(userId: string, blockedReason: string): Promise<any> {
        const response = await this.api.patch(`/admin/users/${userId}/block`, {
            blockedReason,
        });
        return response.data;
    }

    async unblockUser(userId: string): Promise<any> {
        const response = await this.api.patch(`/admin/users/${userId}/unblock`, {});
        return response.data;
    }

    async getUserAuditLogs(userId: string, page: number = 1, limit: number = 50): Promise<any> {
        const response = await this.api.get(`/admin/users/${userId}/audit`, {
            params: { page, limit },
        });
        return response.data;
    }

    async getUserTrustedDevices(userId: string): Promise<any> {
        const response = await this.api.get(`/admin/users/${userId}/trusted-devices`);
        return response.data;
    }

    async revokeTrustedDevice(deviceId: string): Promise<any> {
        const response = await this.api.delete(`/admin/trusted-devices/${deviceId}`);
        return response.data;
    }

    // ===== Reserved Usernames Endpoints =====

    async getReservedUsernames(page: number = 1, limit: number = 50, search?: string): Promise<any> {
        const response = await this.api.get('/admin/reserved-usernames', {
            params: { page, limit, search },
        });
        return response.data;
    }

    async addReservedUsername(username: string, reason?: string): Promise<any> {
        const response = await this.api.post('/admin/reserved-usernames', {
            username,
            reason,
        });
        return response.data;
    }

    async updateReservedUsername(username: string, reason: string): Promise<any> {
        const response = await this.api.put(`/admin/reserved-usernames/${username}`, {
            reason,
        });
        return response.data;
    }

    async deleteReservedUsername(username: string): Promise<any> {
        const response = await this.api.delete(`/admin/reserved-usernames/${username}`);
        return response.data;
    }
}

export default new ApiService();
