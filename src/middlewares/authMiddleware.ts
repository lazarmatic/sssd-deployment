/**
 * JWT Middleware
 * Handles JWT token verification and session management
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwtService';
import { getSession } from '../services/sessionService';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                username: string;
                email: string;
                role?: string;
            };
            sessionId?: string;
        }
    }
}

/**
 * Middleware to verify JWT access token
 */
export async function verifyJWTToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Missing or invalid authorization header',
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            res.status(401).json({
                error: 'Invalid or expired token',
            });
            return;
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        res.status(401).json({
            error: 'Token verification failed',
        });
    }
}

/**
 * Middleware to verify session validity
 */
export async function verifySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Try to get session ID from various sources
        const sessionId = req.body.sessionId || req.query.sessionId || req.cookies?.sessionId;

        if (!sessionId) {
            res.status(401).json({
                error: 'Session ID required',
            });
            return;
        }

        const session = await getSession(sessionId);
        if (!session) {
            res.status(401).json({
                error: 'Session not found or expired',
            });
            return;
        }

        // Attach session ID to request
        req.sessionId = sessionId;

        next();
    } catch (error) {
        console.error('Session verification error:', error);
        res.status(401).json({
            error: 'Session verification failed',
        });
    }
}

/**
 * Middleware to check if user is authenticated
 */
export async function isAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await verifyJWTToken(req, res, () => {
            if (req.user) {
                next();
            } else {
                res.status(401).json({
                    error: 'Not authenticated',
                });
            }
        });
    } catch (error) {
        res.status(401).json({
            error: 'Authentication failed',
        });
    }
}

/**
 * Middleware to check if user is admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
            error: 'Admin access required',
        });
        return;
    }
    next();
}
