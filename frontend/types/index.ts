/**
 * User-related types
 */

export interface User {
    id: string;
    username: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    twoFactorRequired: boolean;
    totpEnabled: boolean;
    blocked: boolean;
    blockedReason?: string | null;
    createdAt: string;
    updatedAt: string;
    role?: string;
}

export interface LoginRequest {
    username?: string;
    email?: string;
    password: string;
    phone?: string;
    captchaToken?: string;
}

export interface AuthResponse {
    message: string;
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
    user?: User;
    captchaRequired?: boolean;
    code?: string;
}

export interface TwoFAResponse {
    message: string;
    twoFARequired: boolean;
    userId: string;
    sessionId: string;
}

export interface TOTPSetupResponse {
    secret: string;
    qrCodeUrl: string;
    message: string;
}

export interface Session {
    id: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
    isExpired: boolean;
    isRevoked: boolean;
}

export interface AuditLog {
    id: string;
    userId?: string;
    action: string;
    actor: string;
    actorRole?: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    status: string;
    errorMessage?: string;
    createdAt: string;
    details?: any;
}

export interface AuditLogsResponse {
    message: string;
    data: AuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface ReservedUsername {
    id: string;
    username: string;
    reason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrustedDevice {
    id: string;
    deviceName: string;
    userAgent: string;
    ipAddress: string;
    createdAt: string;
    lastUsedAt?: string;
    expiresAt: string;
    isExpired: boolean;
    isRevoked: boolean;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    search?: string;
    blocked?: boolean;
}

export interface ApiError {
    error: string;
    code?: string;
    message?: string;
}
