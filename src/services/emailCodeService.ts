/**
 * Email Verification Code Service
 * Handles generation and validation of email verification codes for 2FA
 */

import { promises as dns } from 'dns';

/**
 * Generate a random 6-digit code for email verification
 * @returns 6-digit code as string
 */
export function generateEmailVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate expiration time for email verification code
 * Codes expire after 10 minutes
 * @returns Date object representing 10 minutes from now
 */
export function getEmailCodeExpiration(): Date {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10); // 10 minutes
    return expirationTime;
}

/**
 * Check if email verification code is valid and not expired
 * @param code - The code to validate
 * @param expirationDate - When the code expires
 * @returns boolean indicating if code is still valid
 */
export function isEmailCodeValid(code: string, expirationDate: Date | null): boolean {
    if (!code || !expirationDate) {
        return false;
    }

    // Check if code has expired
    if (new Date() > expirationDate) {
        return false;
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
        return false;
    }

    return true;
}

/**
 * Generate HTML content for email verification code email
 * @param username - User's username
 * @param code - The 6-digit verification code
 * @returns HTML email body
 */
export function generateEmailCodeContent(username: string, code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Verification Code</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
        .code-box { background-color: #e3f2fd; border: 2px solid #2196F3; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
        .code-display { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2196F3; font-family: monospace; }
        .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Verification Code</h1>
        </div>
        <div class="content">
            <p>Hello ${username},</p>
            <p>Your email verification code is:</p>
            <div class="code-box">
                <div class="code-display">${code}</div>
            </div>
            <p>Enter this code in your login session to verify your email and complete the login process.</p>
            <div class="warning">
                <strong>⏱️ Time Sensitive:</strong> This code will expire in <strong>10 minutes</strong>.
            </div>
            <p><strong>Security Notes:</strong></p>
            <ul>
                <li>Never share this code with anyone.</li>
                <li>We will never ask for this code via phone or any other channel.</li>
                <li>If you did not request this code, please ignore this email.</li>
            </ul>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Security System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Generate plain text version of email verification code
 * @param username - User's username
 * @param code - The 6-digit verification code
 * @returns Plain text email body
 */
export function generateEmailCodeTextContent(username: string, code: string): string {
    return `
Email Verification Code

Hello ${username},

Your email verification code is: ${code}

Enter this code in your login session to verify your email and complete the login process.

⏱️ TIME SENSITIVE:
This code will expire in 10 minutes.

SECURITY NOTES:
- Never share this code with anyone.
- We will never ask for this code via phone or any other channel.
- If you did not request this code, please ignore this email.

© ${new Date().getFullYear()} Security System. All rights reserved.
    `;
}

/**
 * Simulated email sending for verification code
 * In production, use actual email service
 * @param to - Recipient email
 * @param code - The verification code
 * @param username - User's username
 */
export async function sendEmailVerificationCode(
    to: string,
    code: string,
    username: string
): Promise<void> {
    try {
        const htmlContent = generateEmailCodeContent(username, code);
        const textContent = generateEmailCodeTextContent(username, code);

        // TODO: Replace with actual email service
        console.log(`
═══════════════════════════════════════════════════════════════
📧 EMAIL VERIFICATION CODE - SIMULATED SEND
═══════════════════════════════════════════════════════════════
To: ${to}
Subject: Email Verification Code - Expires in 10 minutes
Timestamp: ${new Date().toISOString()}

Code: ${code}
Username: ${username}
═══════════════════════════════════════════════════════════════
        `);

        // Simulated delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log(`✓ Email verification code sent to: ${to}`);
    } catch (error) {
        console.error('Failed to send email verification code:', error);
        throw new Error('Failed to send email verification code');
    }
}
