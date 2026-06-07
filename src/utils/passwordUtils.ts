import bcrypt from 'bcrypt';

/**
 * Password Utility Functions using BCrypt
 * Provides secure password hashing and verification
 */

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using BCrypt
 * Includes built-in salting with the specified salt rounds (cost factor)
 * @param password - The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        console.log('Password hashed successfully');
        return hashed;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to hash password');
    }
}

/**
 * Verify a plain text password against a stored hash
 * Compares the provided password with the hash from the database
 * @param rawPassword - The plain text password from user input
 * @param storedHash - The hashed password stored in the database
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export async function verifyPassword(
    rawPassword: string,
    storedHash: string
): Promise<boolean> {
    try {
        const isMatch = await bcrypt.compare(rawPassword, storedHash);
        console.log('Password verification:', isMatch ? 'MATCH' : 'NO MATCH');
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw new Error('Failed to verify password');
    }
}
