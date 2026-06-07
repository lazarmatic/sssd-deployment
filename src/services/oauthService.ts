/**
 * OAuth Service
 * Handles OAuth provider authentication and account linking
 */

import OAuthAccount from '../models/OAuthAccount';
import User from '../models/User';

interface OAuthProfile {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt?: Date;
}

/**
 * Link OAuth account to existing user
 */
export async function linkOAuthAccount(
    userId: string,
    provider: 'google' | 'github',
    profile: OAuthProfile,
    tokens: OAuthTokens
): Promise<OAuthAccount> {
    try {
        // Check if OAuth account already exists
        const existingAccount = await OAuthAccount.findOne({
            where: {
                provider,
                providerAccountId: profile.id,
            },
        });

        if (existingAccount) {
            // Update tokens
            await existingAccount.update({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            });

            console.log(
                `[OAUTH] Updated ${provider} account ${profile.id} for user ${userId}`
            );
            return existingAccount;
        }

        // Create new OAuth account
        const oauthAccount = await OAuthAccount.create({
            userId,
            provider,
            providerAccountId: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        });

        console.log(`[OAUTH] Linked ${provider} account ${profile.id} to user ${userId}`);
        return oauthAccount;
    } catch (error) {
        console.error('Failed to link OAuth account:', error);
        throw error;
    }
}

/**
 * Find or create user from OAuth profile
 */
export async function findOrCreateOAuthUser(
    provider: 'google' | 'github',
    profile: OAuthProfile,
    tokens: OAuthTokens
): Promise<{ user: User; isNew: boolean; account: OAuthAccount }> {
    try {
        // Check if OAuth account exists
        const existingAccount = await OAuthAccount.findOne({
            where: {
                provider,
                providerAccountId: profile.id,
            },
            include: [{ model: User, as: 'user' }] as any,
        });

        if (existingAccount && (existingAccount as any).user) {
            // Update tokens
            await existingAccount.update({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            });

            return {
                user: (existingAccount as any).user,
                isNew: false,
                account: existingAccount,
            };
        }

        // Check if user with this email exists
        const existingUser = await User.findOne({
            where: { email: profile.email },
        });

        let user: User;
        if (existingUser) {
            user = existingUser;
        } else {
            // Create new user from OAuth profile
            user = await User.create({
                username: profile.email.split('@')[0] + '_' + provider,
                email: profile.email,
                emailVerified: true, // OAuth providers verify email
                passwordHash: '', // OAuth users don't have password
            } as any);

            console.log(`[OAUTH] Created new user ${user.id} from ${provider} OAuth`);
        }

        // Link OAuth account
        const account = await linkOAuthAccount(user.id, provider, profile, tokens);

        return {
            user,
            isNew: !existingUser,
            account,
        };
    } catch (error) {
        console.error('Failed to find or create OAuth user:', error);
        throw error;
    }
}

/**
 * Get OAuth account for user
 */
export async function getUserOAuthAccount(
    userId: string,
    provider: 'google' | 'github'
): Promise<OAuthAccount | null> {
    try {
        const account = await OAuthAccount.findOne({
            where: {
                userId,
                provider,
            },
        });

        return account;
    } catch (error) {
        console.error('Failed to get OAuth account:', error);
        return null;
    }
}

/**
 * Get all OAuth accounts for user
 */
export async function getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    try {
        const accounts = await OAuthAccount.findAll({
            where: { userId },
        });

        return accounts;
    } catch (error) {
        console.error('Failed to get user OAuth accounts:', error);
        return [];
    }
}

/**
 * Unlink OAuth account
 */
export async function unlinkOAuthAccount(
    userId: string,
    provider: 'google' | 'github'
): Promise<void> {
    try {
        const account = await OAuthAccount.findOne({
            where: {
                userId,
                provider,
            },
        });

        if (account) {
            await account.destroy();
            console.log(`[OAUTH] Unlinked ${provider} account from user ${userId}`);
        }
    } catch (error) {
        console.error('Failed to unlink OAuth account:', error);
    }
}

/**
 * Verify OAuth account email matches user email
 */
export function verifyOAuthEmailMatch(userEmail: string, oauthEmail: string): boolean {
    return userEmail.toLowerCase() === oauthEmail.toLowerCase();
}

/**
 * Get OAuth account info in user-friendly format
 */
export function formatOAuthAccount(account: OAuthAccount): {
    provider: string;
    displayName: string;
    email: string;
    linkedAt: Date;
    picture?: string;
} {
    return {
        provider: account.provider,
        displayName: account.name || account.email,
        email: account.email,
        linkedAt: account.createdAt,
        picture: account.picture,
    };
}
