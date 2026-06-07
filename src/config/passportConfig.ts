/**
 * Passport.js OAuth Strategy Configuration
 * Configures Google and GitHub OAuth strategies for SSO
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { findOrCreateOAuthUser } from '../services/oauthService';

// Google OAuth Strategy
export function configureGoogleStrategy() {
    const googleClientID = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/oauth/google/callback';

    if (!googleClientID || !googleClientSecret) {
        console.warn('[OAUTH] Google OAuth credentials not configured. SSO will not work.');
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: googleClientID,
                clientSecret: googleClientSecret,
                callbackURL: googleCallbackURL,
            },
            async (accessToken: string, refreshToken: string | undefined, profile: any, done: any) => {
                try {
                    const oauthProfile = {
                        id: profile.id,
                        email: profile.emails?.[0]?.value || '',
                        name: profile.displayName,
                        picture: profile.photos?.[0]?.value,
                    };

                    const tokens = {
                        accessToken,
                        refreshToken,
                        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                    };

                    const result = await findOrCreateOAuthUser('google', oauthProfile, tokens);
                    done(null, { user: result.user, isNew: result.isNew });
                } catch (error) {
                    done(error);
                }
            }
        )
    );

    console.log('[OAUTH] Google OAuth strategy configured');
}

// GitHub OAuth Strategy
export function configureGitHubStrategy() {
    const githubClientID = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    const githubCallbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/oauth/github/callback';

    if (!githubClientID || !githubClientSecret) {
        console.warn('[OAUTH] GitHub OAuth credentials not configured. SSO will not work.');
        return;
    }

    passport.use(
        new GitHubStrategy(
            {
                clientID: githubClientID,
                clientSecret: githubClientSecret,
                callbackURL: githubCallbackURL,
                scope: ['user:email'],
            },
            async (accessToken: string, refreshToken: string | undefined, profile: any, done: any) => {
                try {
                    const oauthProfile = {
                        id: profile.id.toString(),
                        email: profile.emails?.[0]?.value || profile.username + '@github.com',
                        name: profile.displayName || profile.username,
                        picture: profile.photos?.[0]?.value,
                    };

                    const tokens = {
                        accessToken,
                        refreshToken,
                        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                    };

                    const result = await findOrCreateOAuthUser('github', oauthProfile, tokens);
                    done(null, { user: result.user, isNew: result.isNew });
                } catch (error) {
                    done(error);
                }
            }
        )
    );

    console.log('[OAUTH] GitHub OAuth strategy configured');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user: any, done) => {
    done(null, user);
});
