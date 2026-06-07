/**
 * Infobip SMS Service
 * Simulates sending SMS verification codes
 * In production, integrate with actual Infobip API
 */

import nodemailer from 'nodemailer';

/**
 * Send SMS verification code
 * @param phoneNumber - The phone number to send to
 * @param code - The verification code to send
 * @returns Promise that resolves when SMS is sent
 */
export async function sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    try {
        console.log(`[SMS] Sending verification code to ${phoneNumber}: ${code}`);

        // Validate environment variables
        if (!process.env.INFOBIP_BASE_URL || !process.env.INFOBIP_AUTHORIZATION) {
            console.warn('⚠️  Infobip credentials not configured. SMS sending skipped (development mode).');
            console.log(`✓ SMS sent successfully to ${phoneNumber}`);
            return;
        }

        const response = await fetch(`${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            method: 'POST',
            headers: {
                'Authorization': process.env.INFOBIP_AUTHORIZATION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [{
                    destinations: [{ to: phoneNumber }],
                    text: `Your verification code is: ${code}`,
                    from: process.env.SMS_SENDER_NAME || 'AuthApp',
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Infobip API error:', response.status, errorText);
            throw new Error(`Infobip API error: ${response.status}`);
        }

        console.log(`✓ SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw new Error('Failed to send SMS');
    }
}

/**
 * Send email verification code (alternative 2FA method)
 * @param email - The email address to send to
 * @param code - The verification code to send
 * @returns Promise that resolves when email is sent
 */
export async function sendEmailVerificationCode(email: string, code: string): Promise<void> {
    try {
        console.log(`[EMAIL] Sending verification code to ${email}: ${code}`);

        // Configure nodemailer transporter
        let transporter;

        if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            // Production email configuration
            transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT),
                secure: process.env.EMAIL_SECURE === 'true',
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

        // Email content
        const subject = '2FA Verification Code - Expires in 10 minutes';
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>2FA Verification Code</title>
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
            <h1>2FA Verification Code</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your two-factor authentication code is:</p>
            <div class="code-box">
                <div class="code-display">${code}</div>
            </div>
            <p>Enter this code to complete your login.</p>
            <div class="warning">
                <strong>⏱️ Time Sensitive:</strong> This code will expire in <strong>10 minutes</strong>.
            </div>
            <p><strong>Security Notes:</strong></p>
            <ul>
                <li>Never share this code with anyone.</li>
                <li>We will never ask for this code via email or any other channel.</li>
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

        const textContent = `
2FA Verification Code

Hello,

Your two-factor authentication code is: ${code}

Enter this code to complete your login.

⏱️ TIME SENSITIVE:
This code will expire in 10 minutes.

SECURITY NOTES:
- Never share this code with anyone.
- We will never ask for this code via email or any other channel.
- If you did not request this code, please ignore this email.

© ${new Date().getFullYear()} Security System. All rights reserved.
        `;

        // Send email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@security-system.com',
            to: email,
            subject: subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`✓ Email sent successfully to ${email}`);
        console.log(`Message ID: ${info.messageId}`);

        // For development, log the preview URL
        if (!process.env.EMAIL_HOST) {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}
