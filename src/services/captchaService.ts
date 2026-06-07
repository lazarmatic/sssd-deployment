/**
 * CAPTCHA Service
 * Handles hCaptcha verification and challenge logic
 */

import axios from 'axios';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import PasswordResetAttempt from '../models/PasswordResetAttempt';
import { Op } from 'sequelize';

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || 'your-hcaptcha-secret';
const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';

interface CaptchaVerificationResult {
    success: boolean;
    challengeTs?: string;
    hostname?: string;
    errorCodes?: string[];
}

/**
 * Verify hCaptcha token
 */
export async function verifyCaptchaToken(token: string): Promise<CaptchaVerificationResult> {
    try {
        const response = await axios.post(
            HCAPTCHA_VERIFY_URL,
            new URLSearchParams({
                secret: HCAPTCHA_SECRET,
                response: token,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        return {
            success: response.data.success,
            challengeTs: response.data.challenge_ts,
            hostname: response.data.hostname,
            errorCodes: response.data['error-codes'],
        };
    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return {
            success: false,
            errorCodes: ['verification_failed'],
        };
    }
}

/**
 * Check if login requires CAPTCHA (after 3 failed attempts)
 */
export async function shouldRequireLoginCaptcha(
    usernameOrEmail: string,
    ipAddress: string
): Promise<boolean> {
    // Count failed attempts in the last 30 minutes for this username/email
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const failedAttempts = await FailedLoginAttempt.count({
        where: {
            [Op.or]: [
                { username: usernameOrEmail },
                { email: usernameOrEmail },
            ],
            attemptAt: {
                [Op.gte]: thirtyMinutesAgo,
            },
        },
    });

    // Also check by IP
    const failedAttemptsIP = await FailedLoginAttempt.count({
        where: {
            ipAddress,
            attemptAt: {
                [Op.gte]: thirtyMinutesAgo,
            },
        },
    });

    // Require CAPTCHA after 3 failed attempts
    return failedAttempts >= 3 || failedAttemptsIP >= 3;
}

/**
 * Log a failed login attempt
 */
export async function logFailedLoginAttempt(
    usernameOrEmail: string,
    ipAddress: string,
    reason: string = 'invalid_credentials'
): Promise<void> {
    // Determine if it's a username or email
    const isEmail = usernameOrEmail.includes('@');

    await FailedLoginAttempt.create({
        username: !isEmail ? usernameOrEmail : undefined,
        email: isEmail ? usernameOrEmail : undefined,
        ipAddress,
        reason,
    });
}

/**
 * Check if password reset requires CAPTCHA (after 2 failed attempts)
 */
export async function shouldRequirePasswordResetCaptcha(
    email: string,
    ipAddress: string
): Promise<boolean> {
    // Count failed attempts in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const failedAttempts = await PasswordResetAttempt.count({
        where: {
            email,
            success: false,
            attemptAt: {
                [Op.gte]: oneHourAgo,
            },
        },
    });

    // Also check by IP
    const failedAttemptsIP = await PasswordResetAttempt.count({
        where: {
            ipAddress,
            success: false,
            attemptAt: {
                [Op.gte]: oneHourAgo,
            },
        },
    });

    // Require CAPTCHA after 2 failed attempts
    return failedAttempts >= 2 || failedAttemptsIP >= 2;
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
    await PasswordResetAttempt.create({
        email,
        ipAddress,
        success,
        reason: reason || (success ? 'successful_reset' : 'failed_attempt'),
    });
}

/**
 * Clear failed login attempts (after successful login)
 */
export async function clearFailedLoginAttempts(usernameOrEmail: string, ipAddress: string): Promise<void> {
    const isEmail = usernameOrEmail.includes('@');

    await FailedLoginAttempt.destroy({
        where: {
            [Op.or]: [
                isEmail ? { email: usernameOrEmail } : { username: usernameOrEmail },
                { ipAddress },
            ],
        },
    });
}

/**
 * Check if account is rate-limited (too many failed attempts)
 */
export async function isAccountRateLimited(
    usernameOrEmail: string,
    ipAddress: string,
    maxAttempts: number = 10
): Promise<boolean> {
    // Count failed attempts in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const failedAttempts = await FailedLoginAttempt.count({
        where: {
            [Op.or]: [
                { username: usernameOrEmail },
                { email: usernameOrEmail },
            ],
            attemptAt: {
                [Op.gte]: oneHourAgo,
            },
        },
    });

    return failedAttempts >= maxAttempts;
}

/**
 * Get failed login attempts count for display
 */
export async function getFailedLoginAttemptsCount(
    usernameOrEmail: string,
    ipAddress: string
): Promise<number> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const count = await FailedLoginAttempt.count({
        where: {
            [Op.or]: [
                { username: usernameOrEmail },
                { email: usernameOrEmail },
            ],
            attemptAt: {
                [Op.gte]: thirtyMinutesAgo,
            },
        },
    });

    return count;
}
