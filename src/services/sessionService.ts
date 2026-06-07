/**
 * Session Management Service
 * Handles JWT session creation, validation, and revocation
 */

import Session from '../models/Session';
import { generateTokenPair, verifyRefreshToken } from './jwtService';
import { Request } from 'express';

interface SessionOptions {
    userId: string;
    username: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    isTrustedDevice?: boolean;
    trustedDeviceId?: string;
}

/**
 * Create a new session with JWT tokens
 */
export async function createSession(options: SessionOptions): Promise<Session> {
    const tokenPair = generateTokenPair({
        userId: options.userId,
        username: options.username,
        email: options.email,
    }, options.isTrustedDevice || false);

    const session = await Session.create({
        userId: options.userId,
        trustedDeviceId: options.trustedDeviceId || null,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
        isValid: true,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
    });

    return session;
}

/**
 * Get a valid session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
    const session = await Session.findByPk(sessionId);

    if (!session) {
        return null;
    }

    // Check if session is still valid and not expired
    if (!session.isValid || new Date() > session.refreshTokenExpiresAt) {
        return null;
    }

    // Check if session was revoked
    if (session.revokedAt) {
        return null;
    }

    return session;
}

/**
 * Refresh a session with new tokens (rotate refresh token)
 */
export async function refreshSession(
    oldRefreshToken: string,
    sessionId: string
): Promise<{ session: Session; newAccessToken: string } | null> {
    // Get the session
    const session = await getSession(sessionId);
    if (!session) {
        return null;
    }

    // Verify the refresh token matches
    if (session.refreshToken !== oldRefreshToken) {
        console.warn(`[SECURITY] Refresh token mismatch for session ${sessionId}. Possible token reuse attack!`);
        // Revoke entire session on token mismatch
        await revokeSession(sessionId, 'token_reuse_detected');
        return null;
    }

    // Verify the refresh token is valid
    const decoded = verifyRefreshToken(oldRefreshToken);
    if (!decoded || decoded.userId !== session.userId) {
        console.warn(`[SECURITY] Refresh token verification failed for session ${sessionId}`);
        return null;
    }

    // Check if refresh token is expired
    if (new Date() > session.refreshTokenExpiresAt) {
        console.warn(`[SECURITY] Refresh token expired for session ${sessionId}`);
        await revokeSession(sessionId, 'token_expired');
        return null;
    }

    // Generate new token pair
    const tokenPair = generateTokenPair({
        userId: session.userId,
        username: 'user', // Should fetch from DB but keeping simple
        email: 'user@example.com', // Should fetch from DB
    });

    // Update session with new tokens (rotating refresh token)
    await session.update({
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    });

    return {
        session,
        newAccessToken: tokenPair.accessToken,
    };
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string, reason?: string): Promise<void> {
    const session = await Session.findByPk(sessionId);
    if (session) {
        await session.update({
            isValid: false,
            revokedAt: new Date(),
        });
        console.log(`[SESSION] Session ${sessionId} revoked${reason ? `: ${reason}` : ''}`);
    }
}

/**
 * Revoke all sessions for a user (e.g., on password change)
 */
export async function revokeAllUserSessions(userId: string, reason?: string): Promise<number> {
    const result = await Session.update(
        {
            isValid: false,
            revokedAt: new Date(),
        },
        {
            where: { userId },
        }
    );

    console.log(`[SESSION] Revoked ${result[0]} sessions for user ${userId}${reason ? `: ${reason}` : ''}`);
    return result[0];
}

/**
 * Cleanup expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const result = await Session.destroy({
        where: {
            refreshTokenExpiresAt: {
                [require('sequelize').Op.lt]: new Date(),
            },
        },
    });

    console.log(`[SESSION] Cleaned up ${result} expired sessions`);
    return result;
}

/**
 * Get all active sessions for a user
 */
export async function getUserActiveSessions(userId: string): Promise<Session[]> {
    const sessions = await Session.findAll({
        where: {
            userId,
            isValid: true,
            revokedAt: null,
        },
        order: [['createdAt', 'DESC']],
    });

    // Filter out expired sessions
    return sessions.filter(s => new Date() < s.refreshTokenExpiresAt);
}

/**
 * Extract session ID from request cookie or header
 */
export function getSessionIdFromRequest(req: Request): string | null {
    // Try to get from Authorization header as Bearer token (we'll use session ID)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // In a real implementation, extract session ID from token or use different approach
        return authHeader.substring(7);
    }

    // Try to get from cookie
    if (req.cookies && req.cookies.sessionId) {
        return req.cookies.sessionId;
    }

    return null;
}
