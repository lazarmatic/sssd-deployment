/**
 * Password Recovery Service
 * Handles password reset request generation, validation, and token management
 */

import crypto from 'crypto';
import PasswordReset from '../models/PasswordReset';
import PasswordResetAttempt from '../models/PasswordResetAttempt';
import User from '../models/User';
import { Op } from 'sequelize';

/**
 * Generate a password reset token
 */
export function generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Get password reset token expiration (5 minutes)
 */
export function getPasswordResetTokenExpiration(): Date {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    return expirationTime;
}

/**
 * Create a password reset request
 */
export async function createPasswordResetRequest(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string
): Promise<{ token: string; expiresAt: Date } | null> {
    try {
        // Check if user is verified (unverified accounts cannot reset password)
        const user = await User.findByPk(userId);
        if (!user || !user.emailVerified) {
            return null;
        }

        const token = generatePasswordResetToken();
        const expiresAt = getPasswordResetTokenExpiration();

        const resetRequest = await PasswordReset.create({
            userId,
            resetToken: token,
            tokenExpiresAt: expiresAt,
            attemptCount: 0,
            ipAddress,
            userAgent,
        });

        return {
            token,
            expiresAt,
        };
    } catch (error) {
        console.error('Failed to create password reset request:', error);
        throw error;
    }
}

/**
 * Validate password reset token
 */
export async function validatePasswordResetToken(
    token: string
): Promise<{ valid: boolean; userId?: string; email?: string; error?: string }> {
    try {
        const resetRequest = await PasswordReset.findOne({
            where: { resetToken: token },
            include: [{ model: User, as: 'User', attributes: ['id', 'email'] }] as any,
        });

        if (!resetRequest) {
            return { valid: false, error: 'Invalid reset token' };
        }

        // Check if token has expired
        if (new Date() > resetRequest.tokenExpiresAt) {
            return { valid: false, error: 'Token has expired' };
        }

        // Check if token has already been used
        if (resetRequest.usedAt) {
            return { valid: false, error: 'Token has already been used' };
        }

        // Check if max attempts exceeded
        if (resetRequest.attemptCount >= resetRequest.maxAttempts) {
            return { valid: false, error: 'Maximum reset attempts exceeded. Please request a new reset link.' };
        }

        return {
            valid: true,
            userId: resetRequest.userId,
            email: (resetRequest as any).user?.email,
        };
    } catch (error) {
        console.error('Token validation error:', error);
        return { valid: false, error: 'Token validation failed' };
    }
}

/**
 * Increment reset attempt count
 */
export async function incrementResetAttempt(token: string): Promise<void> {
    try {
        const resetRequest = await PasswordReset.findOne({
            where: { resetToken: token },
        });

        if (resetRequest) {
            await resetRequest.increment('attemptCount');
        }
    } catch (error) {
        console.error('Failed to increment reset attempt:', error);
    }
}

/**
 * Mark password reset token as used
 */
export async function markResetTokenAsUsed(token: string): Promise<void> {
    try {
        const resetRequest = await PasswordReset.findOne({
            where: { resetToken: token },
        });

        if (resetRequest) {
            await resetRequest.update({ usedAt: new Date() });
        }
    } catch (error) {
        console.error('Failed to mark token as used:', error);
    }
}

/**
 * Log a password reset attempt
 */
export async function logPasswordResetAttempt(
    email: string,
    ipAddress: string,
    success: boolean = false,
    reason: string = ''
): Promise<void> {
    try {
        await PasswordResetAttempt.create({
            email,
            ipAddress,
            success,
            reason: reason || (success ? 'successful_reset' : 'failed_attempt'),
        });
    } catch (error) {
        console.error('Failed to log password reset attempt:', error);
    }
}

/**
 * Check if account has exceeded password reset attempts
 */
export async function hasExceededResetAttempts(
    email: string,
    ipAddress: string,
    maxAttempts: number = 2,
    windowMinutes: number = 60
): Promise<boolean> {
    try {
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

        const attemptCount = await PasswordResetAttempt.count({
            where: {
                [Op.or]: [{ email }, { ipAddress }],
                success: false,
                attemptAt: {
                    [Op.gte]: windowStart,
                },
            },
        });

        return attemptCount >= maxAttempts;
    } catch (error) {
        console.error('Failed to check reset attempts:', error);
        return false;
    }
}

/**
 * Get reset attempts count
 */
export async function getResetAttemptsCount(
    email: string,
    ipAddress: string,
    windowMinutes: number = 60
): Promise<number> {
    try {
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

        const count = await PasswordResetAttempt.count({
            where: {
                [Op.or]: [{ email }, { ipAddress }],
                success: false,
                attemptAt: {
                    [Op.gte]: windowStart,
                },
            },
        });

        return count;
    } catch (error) {
        console.error('Failed to get reset attempts:', error);
        return 0;
    }
}

/**
 * Check if window for multiple resets has expired
 */
export async function hasResetWindowExpired(
    userId: string,
    windowMinutes: number = 10
): Promise<boolean> {
    try {
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

        const recentReset = await PasswordResetAttempt.findOne({
            where: {
                success: true,
                attemptAt: {
                    [Op.gte]: windowStart,
                },
            },
        });

        return !recentReset;
    } catch (error) {
        console.error('Failed to check reset window:', error);
        return true;
    }
}

/**
 * Cleanup expired reset requests
 */
export async function cleanupExpiredResetRequests(): Promise<number> {
    try {
        const result = await PasswordReset.destroy({
            where: {
                tokenExpiresAt: {
                    [Op.lt]: new Date(),
                },
            },
        });

        console.log(`[PASSWORD_RESET] Cleaned up ${result} expired reset requests`);
        return result;
    } catch (error) {
        console.error('Failed to cleanup expired resets:', error);
        return 0;
    }
}
