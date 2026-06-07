/**
 * Email Verification Service
 * Handles email verification tokens, sending confirmation emails,
 * and validating email verification codes
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Generate a secure email verification token
 * Token format: random hex string that can be used in URLs
 * @returns 32-character hex string
 */
export function generateEmailVerificationToken(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Calculate expiration time for email verification token
 * Tokens expire after 15 minutes as per requirements
 * @returns Date object representing 15 minutes from now
 */
export function getEmailVerificationTokenExpiration(): Date {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // 15 minutes
    return expirationTime;
}

/**
 * Check if email verification token is valid and not expired
 * @param token - The token to validate
 * @param expirationDate - When the token expires
 * @returns boolean indicating if token is still valid
 */
export function isEmailVerificationTokenValid(
    token: string,
    expirationDate: Date | null
): boolean {
    if (!token || !expirationDate) {
        return false;
    }

    // Check if token has expired
    if (new Date() > expirationDate) {
        return false;
    }

    return true;
}

/**
 * Format email verification link for sending in email
 * @param token - The verification token
 * @param baseUrl - The base URL of your application (e.g., https://app.example.com)
 * @returns Full verification URL
 */
export function formatVerificationLink(token: string, baseUrl: string): string {
    // Remove trailing slash from baseUrl if present
    const cleanUrl = baseUrl.replace(/\/$/, '');
    return `${cleanUrl}/verify-email?token=${token}`;
}

/**
 * Generate email verification HTML content
 * @param username - User's username
 * @param verificationLink - The verification link
 * @returns HTML email body
 */
export function generateEmailVerificationContent(
    username: string,
    verificationLink: string
): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
        .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Verification Required</h1>
        </div>
        <div class="content">
            <p>Hello ${username},</p>
            <p>Thank you for registering with us! To complete your account setup and activate your account, please verify your email address.</p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            <p>Or copy this link and paste it into your browser:</p>
            <p><code>${verificationLink}</code></p>
            <div class="warning">
                <strong>⏱️ Time Sensitive:</strong> This verification link will expire in <strong>15 minutes</strong>. 
                Please verify your email address promptly. If you don't verify within this time, you'll need to request a new verification link.
            </div>
            <p><strong>Important Security Notes:</strong></p>
            <ul>
                <li>This link is single-use only. Once used, it cannot be used again.</li>
                <li>Do not share this link with anyone.</li>
                <li>We will never ask you to verify your email through email or messages outside of this system.</li>
            </ul>
        </div>
        <div class="footer">
            <p>If you did not create this account, please ignore this email and let us know by contacting support.</p>
            <p>&copy; ${new Date().getFullYear()} Security System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Generate plain text version of email verification (for email clients without HTML support)
 * @param username - User's username
 * @param verificationLink - The verification link
 * @returns Plain text email body
 */
export function generateEmailVerificationTextContent(
    username: string,
    verificationLink: string
): string {
    return `
Email Verification Required

Hello ${username},

Thank you for registering with us! To complete your account setup and activate your account, please verify your email address.

Click the link below to verify your email:
${verificationLink}

⏱️ TIME SENSITIVE:
This verification link will expire in 15 minutes. Please verify your email address promptly.
If you don't verify within this time, you'll need to request a new verification link.

IMPORTANT SECURITY NOTES:
- This link is single-use only. Once used, it cannot be used again.
- Do not share this link with anyone.
- We will never ask you to verify your email through email or messages outside of this system.

If you did not create this account, please ignore this email and let us know by contacting support.

© ${new Date().getFullYear()} Security System. All rights reserved.
    `;
}

/**
 * Simulated email sending function
 * In production, use Sendgrid, AWS SES, or similar service
 * @param to - Recipient email
 * @param subject - Email subject
 * @param htmlContent - HTML email body
 * @param textContent - Plain text email body
 */
export async function sendVerificationEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string
): Promise<void> {
    try {
        // Configure nodemailer transporter
        // Using ethereal for development, or use environment variables for production
        let transporter;

        if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            // Production email configuration
            transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT),
                secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                }
            });
        } else {
            // Development mode - use ethereal test account
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                }
            });
        }

        // Send email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@security-system.com',
            to: to,
            subject: subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`✓ Email verification sent to: ${to}`);
        console.log(`Message ID: ${info.messageId}`);

        // For development, log the preview URL
        if (!process.env.EMAIL_HOST) {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new Error('Failed to send verification email');
    }
}

/**
 * Send password recovery email
 */
export async function sendPasswordRecoveryEmail(
    email: string,
    username: string,
    resetLink: string
): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Recovery</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
        .button { display: inline-block; background-color: #FF9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Recovery Request</h1>
        </div>
        <div class="content">
            <p>Hello ${username},</p>
            <p>We received a request to reset the password for your account. If you made this request, click the button below to reset your password.</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>Or copy this link and paste it into your browser:</p>
            <p><code>${resetLink}</code></p>
            <div class="warning">
                <strong>⏱️ Time Sensitive:</strong> This recovery link will expire in <strong>5 minutes</strong>. 
                Please reset your password promptly.
            </div>
            <p><strong>Important Security Notes:</strong></p>
            <ul>
                <li>This link is single-use only.</li>
                <li>Do not share this link with anyone.</li>
                <li>If you did not request this password reset, please ignore this email. Your account is secure.</li>
            </ul>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Security System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
Password Recovery Request

Hello ${username},

We received a request to reset the password for your account. If you made this request, click the link below to reset your password:

${resetLink}

⏱️ TIME SENSITIVE:
This recovery link will expire in 5 minutes. Please reset your password promptly.

If you did not request this password reset, please ignore this email. Your account is secure.

© ${new Date().getFullYear()} Security System. All rights reserved.
    `;

    await sendVerificationEmail(email, 'Password Recovery Request', htmlContent, textContent);
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmationEmail(
    email: string,
    username: string
): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .info-box { background-color: #e8f5e9; border: 1px solid #4CAF50; padding: 15px; border-radius: 4px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
            <p>Hello ${username},</p>
            <p>Your password has been successfully changed. If you did not make this change, please contact support immediately.</p>
            <div class="info-box">
                <h3>✓ Your account is now more secure</h3>
                <p>Your new password has been activated. You can log in with your new password starting immediately.</p>
            </div>
            <p><strong>Security Tips:</strong></p>
            <ul>
                <li>Keep your password unique and strong</li>
                <li>Never share your password with anyone</li>
                <li>Use two-factor authentication for additional security</li>
            </ul>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Security System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
Password Changed Successfully

Hello ${username},

Your password has been successfully changed. If you did not make this change, please contact support immediately.

Your new password has been activated. You can log in with your new password starting immediately.

Security Tips:
- Keep your password unique and strong
- Never share your password with anyone
- Use two-factor authentication for additional security

© ${new Date().getFullYear()} Security System. All rights reserved.
    `;

    await sendVerificationEmail(email, 'Password Changed Successfully', htmlContent, textContent);
}

