import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

/**
 * TOTP (Time-based One-Time Password) Utility Functions
 * Handles secret generation, URI creation, QR code generation, and token verification
 */

/**
 * Generate a new TOTP secret
 * @returns Base32 encoded secret string
 */
export function generateTOTPSecret(): string {
    const secret = speakeasy.generateSecret({
        name: 'SSSD Lab App',
        length: 32,
    });
    return secret.base32 || '';
}

/**
 * Generate OTP Auth URI for QR code
 * @param secret - The Base32 encoded secret
 * @param userEmail - User's email address (shown in authenticator app)
 * @param issuer - App/service name (shown in authenticator app)
 * @returns OTP Auth URI string
 */
export function generateOTPAuthURI(
    secret: string,
    userEmail: string,
    issuer: string = 'SSSD Lab App'
): string {
    const otpAuthUri = speakeasy.otpauthURL({
        secret,
        label: userEmail,
        issuer,
        encoding: 'base32',
    });
    return otpAuthUri;
}

/**
 * Generate QR code image as Data URL
 * @param otpAuthUri - The OTP Auth URI
 * @returns Promise resolving to QR code as Data URL (base64 PNG)
 */
export async function generateQRCodeDataURL(otpAuthUri: string): Promise<string> {
    try {
        const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUri);
        return qrCodeDataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Generate current TOTP token (for testing purposes)
 * @param secret - The Base32 encoded secret
 * @returns Current 6-digit TOTP token
 */
export async function generateTOTPToken(secret: string): Promise<string> {
    try {
        const token = speakeasy.totp({
            secret,
            encoding: 'base32',
        });
        return token;
    } catch (error) {
        console.error('Error generating TOTP token:', error);
        throw new Error('Failed to generate TOTP token');
    }
}

/**
 * Verify a TOTP token
 * @param secret - The Base32 encoded secret from database
 * @param token - The 6-digit token provided by user
 * @returns Result object with valid flag and error if any
 */
export async function verifyTOTPToken(
    secret: string,
    token: string
): Promise<{ valid: boolean; error?: string }> {
    try {
        // Validate token format (should be 6 digits)
        if (!/^\d{6}$/.test(token)) {
            return {
                valid: false,
                error: 'Invalid token format. Must be 6 digits.',
            };
        }

        // Verify token with window for time skew
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2, // Allow 2 time windows (±30 seconds)
        });

        if (isValid) {
            console.log('✓ TOTP token verified successfully');
            return { valid: true };
        } else {
            console.log('✗ TOTP token verification failed');
            return {
                valid: false,
                error: 'Invalid or expired token. Please try again.',
            };
        }
    } catch (error) {
        console.error('Error verifying TOTP token:', error);
        return {
            valid: false,
            error: 'Failed to verify token.',
        };
    }
}

/**
 * Complete 2FA setup process
 * @param userEmail - User's email
 * @returns Object with secret, otpAuthUri, and qrCodeDataUrl
 */
export async function setupTOTP2FA(userEmail: string): Promise<{
    secret: string;
    otpAuthUri: string;
    qrCodeDataUrl: string;
}> {
    try {
        console.log('Starting TOTP 2FA setup for:', userEmail);

        // Step 1: Generate secret
        const secret = generateTOTPSecret();
        console.log('✓ Secret generated');

        // Step 2: Generate OTP Auth URI
        const otpAuthUri = generateOTPAuthURI(secret, userEmail);
        console.log('✓ OTP Auth URI generated');

        // Step 3: Generate QR code
        const qrCodeDataUrl = await generateQRCodeDataURL(otpAuthUri);
        console.log('✓ QR code generated');

        return {
            secret,
            otpAuthUri,
            qrCodeDataUrl,
        };
    } catch (error) {
        console.error('Error in setupTOTP2FA:', error);
        throw error;
    }
}
