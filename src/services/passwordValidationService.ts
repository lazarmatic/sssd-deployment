/**
 * Password Validation Service
 * Handles password complexity and breach checking
 */

import axios from 'axios';
import crypto from 'crypto';

/**
 * Password validation result
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    strengthScore: number; // 0-5
    strengthLabel: string; // 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'
}

/**
 * Check password complexity
 */
export function checkPasswordComplexity(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Minimum length check
    if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    // Number check
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    // Calculate strength score
    let strengthScore = 0;
    if (password.length >= 12) strengthScore++;
    if (password.length >= 16) strengthScore++;
    if (/[A-Z]/.test(password)) strengthScore++;
    if (/[a-z]/.test(password)) strengthScore++;
    if (/\d/.test(password)) strengthScore++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strengthScore++;

    // More bonus for very long passwords
    if (password.length >= 20) strengthScore++;

    strengthScore = Math.min(5, Math.floor(strengthScore / 1.2));

    const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Strong', 'Very Strong'];
    const strengthLabel = strengthLabels[strengthScore];

    return {
        isValid: errors.length === 0,
        errors,
        strengthScore,
        strengthLabel,
    };
}

/**
 * Check password against HIBP (Have I Been Pwned) database
 * Uses k-anonymity: sends only first 5 chars of SHA1 hash
 */
export async function checkPasswordBreach(password: string): Promise<{
    breached: boolean;
    count: number;
}> {
    try {
        const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
        const prefix = sha1Hash.substring(0, 5);
        const suffix = sha1Hash.substring(5);

        const response = await axios.get(
            `https://api.pwnedpasswords.com/range/${prefix}`,
            {
                timeout: 5000,
                headers: {
                    'User-Agent': 'SSSD-Authentication-System/1.0',
                },
            }
        );

        const hashes = response.data.split('\r\n');
        for (const hash of hashes) {
            const [hashSuffix, count] = hash.split(':');
            if (hashSuffix === suffix) {
                console.log(`[PASSWORD_BREACH] Password found ${count} times in HIBP database`);
                return {
                    breached: true,
                    count: parseInt(count, 10),
                };
            }
        }

        return {
            breached: false,
            count: 0,
        };
    } catch (error) {
        console.error('Failed to check password breach:', error);
        // On error, fail securely - assume breach
        return {
            breached: true,
            count: -1,
        };
    }
}

/**
 * Comprehensive password validation
 */
export async function validatePassword(
    password: string,
    checkBreach: boolean = true
): Promise<PasswordValidationResult> {
    const complexityResult = checkPasswordComplexity(password);

    if (!complexityResult.isValid) {
        return complexityResult;
    }

    if (checkBreach) {
        const breachResult = await checkPasswordBreach(password);
        if (breachResult.breached) {
            return {
                isValid: false,
                errors: [
                    `Password has been found in ${breachResult.count} known data breaches. Please choose a different password.`,
                ],
                strengthScore: complexityResult.strengthScore,
                strengthLabel: complexityResult.strengthLabel,
            };
        }
    }

    return complexityResult;
}

/**
 * Check if new password is similar to old password (basic check)
 */
export function isSimilarToOldPassword(
    newPassword: string,
    oldPassword: string,
    similarityThreshold: number = 0.7
): boolean {
    // Simple check: if more than 70% of characters are the same, consider it similar
    const lowerNew = newPassword.toLowerCase();
    const lowerOld = oldPassword.toLowerCase();

    let matches = 0;
    const maxLength = Math.max(lowerNew.length, lowerOld.length);

    for (let i = 0; i < Math.min(lowerNew.length, lowerOld.length); i++) {
        if (lowerNew[i] === lowerOld[i]) {
            matches++;
        }
    }

    const similarity = matches / maxLength;
    return similarity > similarityThreshold;
}
