/**
 * Password Validation Utilities
 * Includes password complexity checking and reserved username validation
 */

/**
 * Validate password complexity
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*)
 * @param password - The password to validate
 * @returns Object with validation status and error message
 */
export function validatePasswordComplexity(password: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Length check
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter');
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least 1 lowercase letter');
    }

    // Number check
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number');
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least 1 special character (!@#$%^&*)');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Reserved usernames that cannot be registered
 * Prevents confusion and hijacking of system accounts
 */
const RESERVED_USERNAMES = new Set([
    // System usernames
    'admin', 'root', 'system', 'administrator', 'administrator',
    'superuser', 'sudo', 'sysadmin', 'systemadmin',

    // Common service usernames
    'noreply', 'no-reply', 'support', 'help', 'contact',
    'sales', 'billing', 'accounts', 'security', 'abuse',
    'postmaster', 'webmaster', 'hostmaster',

    // Reserved for services
    'api', 'bot', 'automation', 'service', 'app',
    'test', 'demo', 'staging', 'production',
    'localhost', 'server', 'database',

    // Social engineering prevention
    'vip', 'premium', 'moderator', 'staff', 'staff',
    'official', 'verified', 'developer', 'engineer',

    // HTTP methods and API terms
    'api', 'config', 'settings', 'profile', 'account',
    'login', 'logout', 'register', 'signup',

    // Common acronyms
    'ceo', 'cto', 'cfo', 'hr', 'it', 'dev', 'ops',
    'qa', 'ux', 'ui', 'pm', 'ba', 'sa',
]);

/**
 * Check if username is reserved
 * @param username - The username to validate
 * @returns Object with validation status and error message
 */
export function isUsernameReserved(username: string): {
    isReserved: boolean;
    error?: string;
} {
    const normalizedUsername = username.toLowerCase();

    if (RESERVED_USERNAMES.has(normalizedUsername)) {
        return {
            isReserved: true,
            error: `Username '${username}' is reserved and cannot be used. Please choose a different username.`,
        };
    }

    return { isReserved: false };
}

/**
 * Validate username format and rules
 * @param username - The username to validate
 * @returns Object with validation status and error messages
 */
export function validateUsername(username: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!username || username.length === 0) {
        errors.push('Username is required');
        return { isValid: false, errors };
    }

    // Length check (4-50 characters as per database schema)
    if (username.length < 4) {
        errors.push('Username must be at least 4 characters long');
    }

    if (username.length > 50) {
        errors.push('Username must be at most 50 characters long');
    }

    // Alphanumeric and underscore check
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Must start with letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
        errors.push('Username must start with a letter or number');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
