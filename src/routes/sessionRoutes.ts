/**
 * Session Routes
 * Handles JWT token refresh and logout endpoints
 */

import { Router, Request, Response } from 'express';
import { refreshSession, revokeSession, getUserActiveSessions, revokeAllUserSessions } from '../services/sessionService';
import { verifyAccessToken, verifyRefreshToken } from '../services/jwtService';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { logLogout } from '../services/auditService';
import { getClientIP, getUserAgent } from '../services/auditService';

const router = Router();

/**
 * POST /session/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken, sessionId } = req.body;

        if (!refreshToken || !sessionId) {
            return res.status(400).json({
                error: 'Refresh token and session ID are required',
            });
        }

        // Refresh the session
        const result = await refreshSession(refreshToken, sessionId);
        if (!result) {
            return res.status(401).json({
                error: 'Failed to refresh session. Please login again.',
            });
        }

        return res.status(200).json({
            message: 'Token refreshed successfully',
            accessToken: result.newAccessToken,
            accessTokenExpiresAt: result.session.accessTokenExpiresAt,
            refreshToken: result.session.refreshToken,
            refreshTokenExpiresAt: result.session.refreshTokenExpiresAt,
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({
            error: 'Failed to refresh token',
        });
    }
});

/**
 * POST /session/logout
 * Logout and revoke session
 */
router.post('/logout', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;
        const user = req.user;

        if (!user) {
            return res.status(400).json({
                error: 'User information required',
            });
        }

        if (sessionId) {
            // Revoke the session
            await revokeSession(sessionId as string, 'user_revoked');

            // Log the logout event
            await logLogout(
                user.userId,
                user.username,
                getClientIP(req),
                getUserAgent(req)
            );
        }

        return res.status(200).json({
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            error: 'Logout failed',
        });
    }
});

/**
 * POST /session/logout-all
 * Logout and revoke all sessions for the user
 */
router.post('/logout-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(400).json({
                error: 'User information required',
            });
        }

        // Revoke all sessions
        const revokedCount = await revokeAllUserSessions(user.userId, 'user_logout_all');

        // Log the logout event
        await logLogout(
            user.userId,
            user.username,
            getClientIP(req),
            getUserAgent(req)
        );

        return res.status(200).json({
            message: 'All sessions logged out successfully',
            revokedSessions: revokedCount,
        });
    } catch (error) {
        console.error('Logout all error:', error);
        return res.status(500).json({
            error: 'Logout all failed',
        });
    }
});

/**
 * GET /session/active
 * Get all active sessions for the user
 */
router.get('/active', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(400).json({
                error: 'User information required',
            });
        }

        const sessions = await getUserActiveSessions(user.userId);

        return res.status(200).json({
            message: 'Active sessions retrieved',
            sessions: sessions.map(s => ({
                id: s.id,
                ipAddress: s.ipAddress,
                userAgent: s.userAgent,
                createdAt: s.createdAt,
                expiresAt: s.refreshTokenExpiresAt,
            })),
            totalSessions: sessions.length,
        });
    } catch (error) {
        console.error('Get active sessions error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve sessions',
        });
    }
});

/**
 * DELETE /session/:sessionId
 * Revoke a specific session
 */
router.delete('/:sessionId', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const user = req.user;

        if (!user) {
            return res.status(400).json({
                error: 'User information required',
            });
        }

        // Verify the session belongs to the user
        const sessions = await getUserActiveSessions(user.userId);
        const sessionExists = sessions.some(s => s.id === sessionId);

        if (!sessionExists) {
            return res.status(404).json({
                error: 'Session not found',
            });
        }

        // Revoke the session
        await revokeSession(sessionId as string, 'user_revoked');

        return res.status(200).json({
            message: 'Session revoked successfully',
        });
    } catch (error) {
        console.error('Session revocation error:', error);
        return res.status(500).json({
            error: 'Failed to revoke session',
        });
    }
});

export default router;
