/**
 * Password Recovery Routes
 * Handles password reset requests, validation, and completion
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware';
import User from '../models/User';
import { sendPasswordRecoveryEmail, sendPasswordResetConfirmationEmail } from '../services/emailVerificationService';
import {
    createPasswordResetRequest,
    validatePasswordResetToken,
    incrementResetAttempt,
    markResetTokenAsUsed,
    logPasswordResetAttempt,
    hasExceededResetAttempts,
    getResetAttemptsCount,
} from '../services/passwordRecoveryService';
import { validatePassword } from '../services/passwordValidationService';
import * as captchaService from '../services/captchaService';
import * as auditService from '../services/auditService';
import { hashPassword } from '../utils/passwordUtils';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * Request password reset
 * POST /auth/password-recovery/request
 */
router.post('/request', async (req: Request, res: Response) => {
    try {
        const { email, captchaToken } = req.body;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        // Validate email format
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({
                error: 'Valid email is required',
            });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Don't reveal if user exists - return success anyway
            return res.status(200).json({
                message: 'If an account with this email exists, a password reset link will be sent.',
            });
        }

        // Check if user's email is verified
        if (!user.emailVerified) {
            await auditService.logAuditEvent({
                userId: user.id,
                action: 'password_reset_blocked',
                actor: 'system',
                actorRole: 'user',
                resource: 'password_reset',
                status: 'failed',
                errorMessage: 'Email not verified',
                ipAddress,
                userAgent,
            });

            // Still return generic message
            return res.status(200).json({
                message: 'If an account with this email exists, a password reset link will be sent.',
            });
        }

        // Check if too many reset attempts
        const exceededAttempts = await hasExceededResetAttempts(
            email,
            ipAddress,
            2, // max 2 failed attempts
            60 // within 1 hour
        );

        if (exceededAttempts) {
            // Check if CAPTCHA required
            if (!captchaToken) {
                const attemptCount = await getResetAttemptsCount(email, ipAddress, 60);
                return res.status(429).json({
                    error: 'Too many reset requests. CAPTCHA verification required.',
                    captchaRequired: true,
                    attemptCount,
                });
            }

            // Verify CAPTCHA
            const captchaValid = await captchaService.verifyCaptchaToken(captchaToken);
            if (!captchaValid) {
                await logPasswordResetAttempt(email, ipAddress, false, 'captcha_failed');
                return res.status(400).json({
                    error: 'CAPTCHA verification failed',
                });
            }
        }

        // Create password reset request
        const resetRequest = await createPasswordResetRequest(user.id, email, ipAddress, userAgent);

        if (!resetRequest) {
            await logPasswordResetAttempt(email, ipAddress, false, 'user_not_verified');
            return res.status(200).json({
                message: 'If an account with this email exists, a password reset link will be sent.',
            });
        }

        // Send reset email
        try {
            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetRequest.token}`;
            await sendPasswordRecoveryEmail(user.email, user.username, resetLink);
            console.log(`[PASSWORD_RECOVERY] Reset email sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            // Don't fail the request, log it
        }

        // Log successful request
        await auditService.logAuditEvent({
            userId: user.id,
            action: 'password_reset_requested',
            actor: 'user',
            actorRole: 'user',
            resource: 'password_reset',
            status: 'success',
            ipAddress,
            userAgent,
        });

        await logPasswordResetAttempt(email, ipAddress, true, 'reset_link_sent');

        res.status(200).json({
            message: 'If an account with this email exists, a password reset link will be sent.',
        });
    } catch (error) {
        console.error('Password recovery request error:', error);
        res.status(500).json({
            error: 'Failed to process password recovery request',
        });
    }
});

/**
 * Validate reset token
 * POST /auth/password-recovery/validate-token
 */
router.post('/validate-token', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: 'Reset token is required',
            });
        }

        const validation = await validatePasswordResetToken(token);

        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                valid: false,
            });
        }

        res.status(200).json({
            valid: true,
            email: validation.email,
        });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({
            error: 'Token validation failed',
        });
    }
});

/**
 * Reset password
 * POST /auth/password-recovery/reset
 */
router.post('/reset', async (req: Request, res: Response) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        // Validate input
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: 'Reset token is required',
            });
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length === 0) {
            return res.status(400).json({
                error: 'New password is required',
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: 'Passwords do not match',
            });
        }

        // Validate password strength and breach
        const passwordValidation = await validatePassword(newPassword, true);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors,
            });
        }

        // Validate token
        const validation = await validatePasswordResetToken(token);
        if (!validation.valid) {
            await incrementResetAttempt(token);
            await logPasswordResetAttempt(validation.email || '', ipAddress, false, validation.error);

            return res.status(400).json({
                error: validation.error,
            });
        }

        const userId = validation.userId!;
        const userEmail = validation.email!;

        // Get user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Check if new password is similar to old password
        if (user.passwordHash) {
            const isSame = await bcrypt.compare(newPassword, user.passwordHash);
            if (isSame) {
                await logPasswordResetAttempt(userEmail, ipAddress, false, 'same_as_old_password');
                return res.status(400).json({
                    error: 'New password must be different from the current password',
                });
            }
        }

        // Update password
        const hashedPassword = await hashPassword(newPassword);
        await user.update({ passwordHash: hashedPassword });

        // Mark token as used
        await markResetTokenAsUsed(token);

        // Log success
        await logPasswordResetAttempt(userEmail, ipAddress, true, 'password_reset_successful');

        // Send confirmation email
        try {
            await sendPasswordResetConfirmationEmail(userEmail, user.username);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
        }

        // Audit log
        await auditService.logAuditEvent({
            userId: user.id,
            action: 'password_reset',
            actor: 'user',
            actorRole: 'user',
            resource: 'password',
            status: 'success',
            details: { ipAddress, userAgent },
            ipAddress,
            userAgent,
        });

        res.status(200).json({
            message: 'Password has been reset successfully. You can now log in with your new password.',
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            error: 'Failed to reset password',
        });
    }
});

/**
 * Check password strength
 * POST /auth/password-recovery/check-strength
 */
router.post('/check-strength', async (req: Request, res: Response) => {
    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({
                error: 'Password is required',
            });
        }

        const validation = await validatePassword(password, false); // Don't check HIBP for live input

        res.status(200).json({
            strengthScore: validation.strengthScore,
            strengthLabel: validation.strengthLabel,
            requirements: {
                minLength: password.length >= 12,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                numbers: /\d/.test(password),
                specialCharacters: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            },
            errors: validation.errors,
        });
    } catch (error) {
        console.error('Password strength check error:', error);
        res.status(500).json({
            error: 'Failed to check password strength',
        });
    }
});

export default router;
