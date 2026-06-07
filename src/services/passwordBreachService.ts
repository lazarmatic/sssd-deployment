import crypto from 'crypto';

/**
 * Password Breach Checker Service
 * Checks if a password has been compromised using the Have I Been Pwned (HIBP) API
 * Uses k-Anonymity model for enhanced privacy - only sends first 5 characters of SHA-1 hash
 */

const PWNED_PASSWORDS_API = 'https://api.pwnedpasswords.com/range';

/**
 * Check if a password exists in the Have I Been Pwned database
 * Uses SHA-1 hashing and k-Anonymity model for privacy
 * @param password - The plain text password to check
 * @returns Promise resolving to true if password is breached, false otherwise
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
    try {
        // Step 1: Create SHA-1 hash of the password
        const sha1Hash = crypto
            .createHash('sha1')
            .update(password)
            .digest('hex')
            .toUpperCase();

        console.log('Password SHA-1 hash created');

        // Step 2: Extract prefix (first 5 characters) and suffix (last 35 characters)
        const prefix = sha1Hash.slice(0, 5);
        const suffix = sha1Hash.slice(5);

        console.log('Hash prefix extracted for k-Anonymity:', prefix);

        // Step 3: Make API request with prefix only
        const response = await fetch(`${PWNED_PASSWORDS_API}/${prefix}`);

        if (!response.ok) {
            throw new Error(
                `HIBP API request failed with status ${response.status}: ${response.statusText}`
            );
        }

        // Step 4: Get response text and search for suffix
        const data = await response.text();
        console.log('HIBP API response received');

        // Step 5: Search for our hash suffix in the response
        const isFound = data.includes(suffix);

        if (isFound) {
            console.log('⚠️  Password found in breached passwords database!');
            return true;
        } else {
            console.log('✓ Password not found in breached passwords database');
            return false;
        }
    } catch (error) {
        console.error('Error checking password breach status:', error);
        throw new Error('Failed to check password breach status');
    }
}

/**
 * Get breach count for a password if it exists in HIBP database
 * Useful for displaying severity information to users
 * @param password - The plain text password to check
 * @returns Promise resolving to breach count (0 if not found)
 */
export async function getPasswordBreachCount(password: string): Promise<number> {
    try {
        // Create SHA-1 hash of the password
        const sha1Hash = crypto
            .createHash('sha1')
            .update(password)
            .digest('hex')
            .toUpperCase();

        const prefix = sha1Hash.slice(0, 5);
        const suffix = sha1Hash.slice(5);

        // Make API request
        const response = await fetch(`${PWNED_PASSWORDS_API}/${prefix}`);

        if (!response.ok) {
            throw new Error(`HIBP API request failed with status ${response.status}`);
        }

        const data = await response.text();
        const lines = data.split('\r\n');

        // Find the line with our suffix and extract the count
        for (const line of lines) {
            const [hashSuffix, count] = line.split(':');
            if (hashSuffix === suffix) {
                const breachCount = parseInt(count, 10);
                console.log(`Password found in ${breachCount} breaches`);
                return breachCount;
            }
        }

        console.log('Password not found in any breaches');
        return 0;
    } catch (error) {
        console.error('Error getting password breach count:', error);
        throw new Error('Failed to get password breach count');
    }
}
