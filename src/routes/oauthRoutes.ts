/**
 * OAuth Routes
 * Handles Single Sign-On (SSO) with Google and GitHub
 */

import { Router, Request, Response } from 'express';
import passport from 'passport';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { findOrCreateOAuthUser, getUserOAuthAccounts, formatOAuthAccount, unlinkOAuthAccount } from '../services/oauthService';
import { generateTokenPair } from '../services/jwtService';
import { createSession } from '../services/sessionService';
import * as auditService from '../services/auditService';
import User from '../models/User';
import OAuthAccount from '../models/OAuthAccount';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sssdapp.mooo.com/front';

/**
 * Google OAuth initiation
 * GET /oauth/google
 */
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

/**
 * Google OAuth callback from provider
 * GET /oauth/google/callback
 */
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed` }),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
            }

            const ipAddress = auditService.getClientIP(req);
            const userAgent = auditService.getUserAgent(req);

            if (!user.user.emailVerified) {
                return res.redirect(`${FRONTEND_URL}/login?error=email_not_verified&userId=${user.user.id}`);
            }

            if (user.user.blocked) {
                return res.redirect(`${FRONTEND_URL}/login?error=account_blocked&reason=${user.user.blockedReason}`);
            }

            if (user.user.twoFactorRequired || user.user.totpEnabled) {
                return res.redirect(
                    `${FRONTEND_URL}/login?requires_mfa=true&userId=${user.user.id}&provider=google&isNew=${user.isNew}`
                );
            }

            const tokenPair = generateTokenPair({
                userId: user.user.id,
                username: user.user.username,
                email: user.user.email,
            }, false);

            const jwtSession = await createSession({
                userId: user.user.id,
                username: user.user.username,
                email: user.user.email,
                ipAddress,
                userAgent,
            });

            await auditService.logAuditEvent({
                userId: user.user.id,
                action: 'sso_login',
                actor: user.user.username,
                actorRole: 'user',
                resource: 'oauth',
                resourceId: 'google',
                status: 'success',
                details: { isNew: user.isNew, provider: 'google' },
                ipAddress,
                userAgent,
            });

            const redirectUrl = `${FRONTEND_URL}/auth/callback?sessionId=${jwtSession.id}&accessToken=${tokenPair.accessToken}&refreshToken=${tokenPair.refreshToken}&isNew=${user.isNew}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
        }
    }
);

/**
 * GitHub OAuth initiation
 * GET /oauth/github
 */
router.get(
    '/github',
    passport.authenticate('github', {
        scope: ['user:email'],
        session: false,
    })
);

/**
 * GitHub OAuth callback from provider
 * GET /oauth/github/callback
 */
router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=github_auth_failed` }),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
            }

            const ipAddress = auditService.getClientIP(req);
            const userAgent = auditService.getUserAgent(req);

            if (!user.user.emailVerified) {
                return res.redirect(`${FRONTEND_URL}/login?error=email_not_verified&userId=${user.user.id}`);
            }

            if (user.user.blocked) {
                return res.redirect(`${FRONTEND_URL}/login?error=account_blocked&reason=${user.user.blockedReason}`);
            }

            if (user.user.twoFactorRequired || user.user.totpEnabled) {
                return res.redirect(
                    `${FRONTEND_URL}/login?requires_mfa=true&userId=${user.user.id}&provider=github&isNew=${user.isNew}`
                );
            }

            const tokenPair = generateTokenPair({
                userId: user.user.id,
                username: user.user.username,
                email: user.user.email,
            }, false);

            const jwtSession = await createSession({
                userId: user.user.id,
                username: user.user.username,
                email: user.user.email,
                ipAddress,
                userAgent,
            });

            await auditService.logAuditEvent({
                userId: user.user.id,
                action: 'sso_login',
                actor: user.user.username,
                actorRole: 'user',
                resource: 'oauth',
                resourceId: 'github',
                status: 'success',
                details: { isNew: user.isNew, provider: 'github' },
                ipAddress,
                userAgent,
            });

            const redirectUrl = `${FRONTEND_URL}/auth/callback?sessionId=${jwtSession.id}&accessToken=${tokenPair.accessToken}&refreshToken=${tokenPair.refreshToken}&isNew=${user.isNew}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('GitHub OAuth callback error:', error);
            res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
        }
    }
);

/**
 * Google OAuth callback
 * POST /oauth/google/callback
 */
router.post('/google/callback', async (req: Request, res: Response) => {
    try {
        const { profile, tokens } = req.body;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        if (!profile || !profile.id || !profile.email) {
            return res.status(400).json({ error: 'Invalid OAuth profile' });
        }

        const { user, isNew, account } = await findOrCreateOAuthUser('google', profile, tokens);

        if (!user.emailVerified) {
            await auditService.logAuditEvent({
                userId: user.id,
                action: 'sso_login_blocked',
                actor: 'system',
                actorRole: 'system',
                resource: 'oauth',
                resourceId: 'google',
                status: 'failed',
                errorMessage: 'Email not verified',
                ipAddress,
                userAgent,
            });
            return res.status(403).json({
                error: 'Your email is not verified.',
                requiresEmailVerification: true,
            });
        }

        if (user.blocked) {
            return res.status(403).json({
                error: 'Your account has been blocked',
                reason: user.blockedReason,
            });
        }

        if (user.twoFactorRequired || user.totpEnabled) {
            const tempTokens = generateTokenPair({ userId: user.id, email: user.email, username: user.username });
            const session = await createSession({ userId: user.id, username: user.username, email: user.email, ipAddress, userAgent });
            return res.status(200).json({
                message: 'Login successful. 2FA verification required.',
                requiresMFA: true,
                sessionId: session.id,
                accessToken: tempTokens.accessToken,
                refreshToken: tempTokens.refreshToken,
            });
        }

        const tokens_pair = generateTokenPair({ userId: user.id, email: user.email, username: user.username });
        const session = await createSession({ userId: user.id, username: user.username, email: user.email, ipAddress, userAgent });

        await auditService.logAuditEvent({
            userId: user.id,
            action: 'sso_login',
            actor: 'user',
            actorRole: 'user',
            resource: 'oauth',
            resourceId: 'google',
            status: 'success',
            details: { isNew, provider: 'google' },
            ipAddress,
            userAgent,
        });

        res.status(200).json({
            message: isNew ? 'Account created and logged in successfully' : 'Logged in successfully',
            sessionId: session.id,
            accessToken: tokens_pair.accessToken,
            refreshToken: tokens_pair.refreshToken,
            user: { id: user.id, username: user.username, email: user.email, emailVerified: user.emailVerified },
        });
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.status(500).json({ error: 'Failed to process OAuth login' });
    }
});

/**
 * GitHub OAuth callback
 * POST /oauth/github/callback
 */
router.post('/github/callback', async (req: Request, res: Response) => {
    try {
        const { profile, tokens } = req.body;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        if (!profile || !profile.id || !profile.email) {
            return res.status(400).json({ error: 'Invalid OAuth profile' });
        }

        const { user, isNew, account } = await findOrCreateOAuthUser('github', profile, tokens);

        if (!user.emailVerified) {
            return res.status(403).json({
                error: 'Your email is not verified.',
                requiresEmailVerification: true,
            });
        }

        if (user.blocked) {
            return res.status(403).json({
                error: 'Your account has been blocked',
                reason: user.blockedReason,
            });
        }

        if (user.twoFactorRequired || user.totpEnabled) {
            const tempTokens = generateTokenPair({ userId: user.id, email: user.email, username: user.username });
            const session = await createSession({ userId: user.id, username: user.username, email: user.email, ipAddress, userAgent });
            return res.status(200).json({
                message: 'Login successful. 2FA verification required.',
                requiresMFA: true,
                sessionId: session.id,
                accessToken: tempTokens.accessToken,
                refreshToken: tempTokens.refreshToken,
            });
        }

        const tokens_pair_github = generateTokenPair({ userId: user.id, email: user.email, username: user.username });
        const session_github = await createSession({ userId: user.id, username: user.username, email: user.email, ipAddress, userAgent });

        await auditService.logAuditEvent({
            userId: user.id,
            action: 'sso_login',
            actor: 'user',
            actorRole: 'user',
            resource: 'oauth',
            resourceId: 'github',
            status: 'success',
            details: { isNew, provider: 'github' },
            ipAddress,
            userAgent,
        });

        res.status(200).json({
            message: isNew ? 'Account created and logged in successfully' : 'Logged in successfully',
            sessionId: session_github.id,
            accessToken: tokens_pair_github.accessToken,
            refreshToken: tokens_pair_github.refreshToken,
            user: { id: user.id, username: user.username, email: user.email, emailVerified: user.emailVerified },
        });
    } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.status(500).json({ error: 'Failed to process OAuth login' });
    }
});

/**
 * Get user's linked OAuth accounts
 * GET /oauth/accounts
 */
router.get('/accounts', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const accounts = await getUserOAuthAccounts(user.userId || user.id);
        const formattedAccounts = accounts.map(formatOAuthAccount);
        res.status(200).json({ accounts: formattedAccounts });
    } catch (error) {
        console.error('Failed to get OAuth accounts:', error);
        res.status(500).json({ error: 'Failed to retrieve OAuth accounts' });
    }
});

/**
 * Unlink OAuth account
 * DELETE /oauth/:provider
 */
router.delete('/:provider', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { provider } = req.params;
        const user = (req as any).user;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const validProviders = ['google', 'github'];
        if (!validProviders.includes(provider as string)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        const oauthAccounts = await OAuthAccount.findAll({ where: { userId: user.userId || user.id } });
        const hasPassword = user.passwordHash && user.passwordHash.length > 0;
        const otherAccounts = oauthAccounts.filter(a => a.provider !== provider);

        if (!hasPassword && otherAccounts.length === 0) {
            return res.status(400).json({ error: 'Cannot unlink your only login method. Set a password first.' });
        }

        await unlinkOAuthAccount(user.userId || user.id, provider as 'google' | 'github');

        await auditService.logAuditEvent({
            userId: user.userId || user.id,
            action: 'oauth_account_unlinked',
            actor: 'user',
            actorRole: 'user',
            resource: 'oauth',
            resourceId: provider as string,
            status: 'success',
            ipAddress,
            userAgent,
        });

        res.status(200).json({ message: `${provider} account has been unlinked` });
    } catch (error) {
        console.error('Failed to unlink OAuth account:', error);
        res.status(500).json({ error: 'Failed to unlink account' });
    }
});

export default router;