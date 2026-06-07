/**
 * Disposable Email Validation Service
 * Prevents registration with temporary/throw-away email providers
 * 
 * Supports two validation methods:
 * 1. NPM package: isDisposableEmail from 'disposable-email-domains-js'
 * 2. API method: Maintains local blocklist from GitHub repository
 */

import { isDisposableEmail } from 'disposable-email-domains-js';

/**
 * Validate if an email is from a disposable email provider
 * Using the npm package method (Option 1)
 * 
 * @param email - The email address to check
 * @returns boolean indicating if the email is disposable
 */
export function checkDisposableEmailNPM(email: string): boolean {
    try {
        return isDisposableEmail(email);
    } catch (error) {
        console.error('Error checking disposable email (NPM method):', error);
        // On error, assume it's not disposable and allow registration
        // In production, you might want to be more strict
        return false;
    }
}

/**
 * Validate if an email is from a disposable email provider
 * Checks both the full domain and subdomains
 * @param email - The email address to check
 * @param blocklist - Set of blocked disposable email domains
 * @returns Object with validation status and details
 */
export function checkDisposableEmailWithBlocklist(
    email: string,
    blocklist: Set<string>
): {
    isDisposable: boolean;
    matchedDomain?: string;
    error?: string;
} {
    try {
        const parts = email.split('@');
        if (parts.length !== 2) {
            return {
                isDisposable: false,
                error: 'Invalid email format',
            };
        }

        const domain = parts[1];
        const domainParts = domain.split('.');

        // Check the domain and all its subdomains
        for (let i = 0; i < domainParts.length - 1; i++) {
            const subdomain = domainParts.slice(i).join('.');
            if (blocklist.has(subdomain)) {
                return {
                    isDisposable: true,
                    matchedDomain: subdomain,
                };
            }
        }

        return {
            isDisposable: false,
        };
    } catch (error) {
        console.error('Error checking disposable email (Blocklist method):', error);
        return {
            isDisposable: false,
            error: 'Error validating disposable email',
        };
    }
}

/**
 * Simple pre-check for obviously disposable email domains
 * Useful as a quick check before doing more expensive validations
 * @param email - The email address to check
 * @returns boolean indicating if email looks disposable
 */
export function isLikelyDisposable(email: string): boolean {
    const disposableDomains = [
        'mailinator.com',
        'tempmail.com',
        '10minutemail.com',
        'guerrillamail.com',
        'maildrop.cc',
        'sharklasers.com',
        'spam4.me',
        'tempmail.net',
        'throwaway.email',
        'yopmail.com',
    ];

    try {
        const domain = email.split('@')[1]?.toLowerCase();
        return disposableDomains.includes(domain);
    } catch {
        return false;
    }
}
