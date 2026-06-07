/**
 * JWT Token Service
 * Handles generation and verification of JWT access and refresh tokens
 */

import jwt from 'jsonwebtoken';

// Get JWT secret from environment or use default
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';

interface TokenPayload {
    userId: string;
    username: string;
    email: string;
    role?: string;
}

interface TokenResult {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
}

/**
 * Generate JWT access token (15 minutes expiration)
 */
export function generateAccessToken(payload: TokenPayload): { token: string; expiresAt: Date } {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // 15 minutes

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '15m',
        algorithm: 'HS256',
    });

    return { token, expiresAt: expirationTime };
}

/**
 * Generate JWT refresh token (7 days expiration, or 10 days for trusted devices)
 */
export function generateRefreshToken(payload: { userId: string }, isTrustedDevice: boolean = false): { token: string; expiresAt: Date } {
    const expirationTime = new Date();
    const expirationDays = isTrustedDevice ? 10 : 7; // 10 days for trusted devices, 7 for normal
    expirationTime.setDate(expirationTime.getDate() + expirationDays);

    const expiresInString = isTrustedDevice ? '10d' : '7d';
    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: expiresInString,
        algorithm: 'HS256',
    });

    return { token, expiresAt: expirationTime };
}

/**
 * Generate both access and refresh tokens
 * @param payload - Token payload with userId, username, email
 * @param isTrustedDevice - Whether this is for a trusted device (extends refresh token to 10 days)
 */
export function generateTokenPair(payload: TokenPayload, isTrustedDevice: boolean = false): TokenResult {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: payload.userId }, isTrustedDevice);

    return {
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        accessTokenExpiresAt: accessToken.expiresAt,
        refreshTokenExpiresAt: refreshToken.expiresAt,
    };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        return decoded as TokenPayload;
    } catch (error) {
        console.error('Access token verification failed:', error);
        return null;
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
        return decoded as { userId: string };
    } catch (error) {
        console.error('Refresh token verification failed:', error);
        return null;
    }
}

/**
 * Decode token without verification (for inspection)
 */
export function decodeToken(token: string): any {
    try {
        return jwt.decode(token);
    } catch (error) {
        console.error('Token decode failed:', error);
        return null;
    }
}
