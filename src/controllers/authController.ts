/**
 * Authentication Controller
 * Handles login, 2FA code verification, and complete login
 * Includes password hashing and breach checking functionality
 * Exercise Lab: Phone number, email TLD, MX records, and disposable email validation
 */

import { Request, Response } from "express";
import { sendVerificationCode, sendEmailVerificationCode } from "../../scripts/infobip";
import { hashPassword, verifyPassword } from "../utils/passwordUtils";
import { isPasswordBreached, getPasswordBreachCount } from "../services/passwordBreachService";
import { setupTOTP2FA, verifyTOTPToken } from "../utils/totpUtils";
import { validatePhoneNumber, isMobilePhoneNumber } from "../utils/phoneUtils";
import { validateEmailTLD, validateEmailMXRecords } from "../utils/emailUtils";
import { checkDisposableEmailNPM, isLikelyDisposable } from "../services/disposableEmailService";
import { validatePasswordComplexity, isUsernameReserved, validateUsername } from "../utils/validationUtils";
import {
    generateEmailVerificationToken,
    getEmailVerificationTokenExpiration,
    isEmailVerificationTokenValid,
    formatVerificationLink,
    generateEmailVerificationContent,
    generateEmailVerificationTextContent,
    sendVerificationEmail,
    sendPasswordResetConfirmationEmail
} from "../services/emailVerificationService";
import * as auditService from "../services/auditService";
import * as captchaService from "../services/captchaService";
import { isDeviceTrusted, markDeviceAsTrusted } from "../services/trustedDeviceService";
import { generateTokenPair } from "../services/jwtService";
import { createSession, revokeAllUserSessions } from "../services/sessionService";
import { validatePassword } from "../services/passwordValidationService";
import ReservedUsername from '../models/ReservedUsername';
import { config } from "../config";
import User from "../models/User";

// In-memory storage for 2FA codes (in production, use a database with expiration)
interface TwoFASession {
    code: string;
    phoneNumber: string;
    email: string;
    username: string;
    userId: string;
    createdAt: number;
    expiresAt: number;
}

// Store 2FA sessions temporarily
const twoFASessions: Map<string, TwoFASession> = new Map();

// Hardcoded 2FA code for validation (in production, this would be generated and sent)
const HARDCODED_2FA_CODE = "123456";

/**
 * Step 1: Login endpoint - validates credentials and sends 2FA code
 * After credentials are validated, sends SMS with code
 */
export async function login(req: Request, res: Response) {
    try {
        const { username, email, password, phone, captchaToken } = req.body;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);
        const usernameOrEmail = username || email;

        // Validate input
        if ((!username && !email) || !password) {
            return res.status(400).json({
                error: "Username or email and password are required",
            });
        }

        // Check if CAPTCHA is required
        const captchaRequired = await captchaService.shouldRequireLoginCaptcha(
            usernameOrEmail,
            ipAddress
        );

        if (captchaRequired && !captchaToken) {
            const attemptCount = await captchaService.getFailedLoginAttemptsCount(
                usernameOrEmail,
                ipAddress
            );
            return res.status(429).json({
                error: 'Too many failed login attempts. CAPTCHA verification required.',
                captchaRequired: true,
                attemptCount,
            });
        }

        // Verify CAPTCHA if required
        if (captchaRequired && captchaToken) {
            const captchaValid = await captchaService.verifyCaptchaToken(captchaToken);
            if (!captchaValid) {
                await captchaService.logFailedLoginAttempt(
                    usernameOrEmail,
                    ipAddress,
                    'captcha_failed'
                );
                return res.status(400).json({
                    error: 'CAPTCHA verification failed',
                });
            }
            // Clear failed attempts after successful CAPTCHA
            await captchaService.clearFailedLoginAttempts(usernameOrEmail, ipAddress);
        }

        // Fetch user from database
        let user = null;
        if (username) {
            user = await User.findOne({ where: { username } });
        } else if (email) {
            user = await User.findOne({ where: { email } });
        }

        if (!user) {
            await captchaService.logFailedLoginAttempt(
                usernameOrEmail,
                ipAddress,
                'user_not_found'
            );
            await auditService.logAuditEvent({
                action: 'failed_login',
                actor: 'anonymous',
                actorRole: 'guest',
                resource: 'auth',
                status: 'failed',
                errorMessage: 'User not found',
                ipAddress,
                userAgent,
            });
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // ===== REQUIREMENT: Check if user is blocked =====
        if (user.blocked) {
            await auditService.logAuditEvent({
                userId: user.id,
                action: 'login_blocked',
                actor: 'system',
                actorRole: 'system',
                resource: 'user',
                status: 'failed',
                errorMessage: `Account blocked: ${user.blockedReason}`,
                ipAddress,
                userAgent,
            });
            return res.status(403).json({
                error: "Your account has been blocked.",
                code: "ACCOUNT_BLOCKED",
                reason: user.blockedReason || "No reason provided"
            });
        }

        // ===== REQUIREMENT: Unverified accounts cannot log in =====
        if (!user.emailVerified) {
            await auditService.logAuditEvent({
                userId: user.id,
                action: 'login_blocked',
                actor: 'system',
                actorRole: 'system',
                resource: 'user',
                status: 'failed',
                errorMessage: 'Email not verified',
                ipAddress,
                userAgent,
            });
            return res.status(403).json({
                error: "Email verification required. Please verify your email address before logging in.",
                code: "EMAIL_NOT_VERIFIED",
                userId: user.id,
                note: "Check your email for the verification link. You can request a new verification email if needed."
            });
        }

        // Verify password against hash stored in database
        let isValidCredentials = false;
        try {
            isValidCredentials = await verifyPassword(password, user.passwordHash);
        } catch (error) {
            console.error("Password verification error:", error);
            await captchaService.logFailedLoginAttempt(
                usernameOrEmail,
                ipAddress,
                'password_verification_error'
            );
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (!isValidCredentials) {
            await captchaService.logFailedLoginAttempt(
                usernameOrEmail,
                ipAddress,
                'invalid_password'
            );
            await auditService.logAuditEvent({
                userId: user.id,
                action: 'failed_login',
                actor: 'user',
                actorRole: 'user',
                resource: 'auth',
                status: 'failed',
                errorMessage: 'Invalid password',
                ipAddress,
                userAgent,
            });
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check if password is compromised
        let isCompromised = false;
        try {
            isCompromised = await isPasswordBreached(password);
            if (isCompromised) {
                console.warn("⚠️  User attempted login with a breached password");
                // You can decide whether to block login or just warn the user
                // For now, we'll allow login but inform the user
            }
        } catch (breachCheckError) {
            console.error("Failed to check password breach status:", breachCheckError);
            // Continue with login even if breach check fails
        }

        // Return phone from user if not provided in request
        const phoneNumber = phone || user.phone;

        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required for 2FA" });
        }

        // ===== Check if device is trusted — skip 2FA if so =====
        const deviceTrustInfo = await isDeviceTrusted(user.id, userAgent, ipAddress);

        if (deviceTrustInfo.trusted) {
            console.log(`[LOGIN] Device is trusted for user ${user.id}, skipping 2FA`);

            const tokenPair = generateTokenPair({
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.username === 'admin' ? 'admin' : 'user',
            }, true);
            const jwtSession = await createSession({
                userId: user.id,
                username: user.username,
                email: user.email,
                ipAddress,
                userAgent,
                isTrustedDevice: true,
                trustedDeviceId: deviceTrustInfo.device?.id,
            });

            await auditService.logAuditEvent({
                userId: user.id,
                action: 'login',
                actor: user.username,
                actorRole: 'user',
                resource: 'auth',
                status: 'success',
                details: { method: 'trusted_device', sessionId: jwtSession.id },
                ipAddress,
                userAgent,
            });

            return res.status(200).json({
                message: "✅ Login successful! Trusted device recognized.",
                sessionId: jwtSession.id,
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    phone: phoneNumber,
                    loginTime: new Date().toISOString(),
                },
                deviceTrusted: true,
                showTrustDeviceOption: false,
            });
        }

        // Generate a 6-digit code
        const verificationCode = HARDCODED_2FA_CODE;

        // Store 2FA session (expires after 10 minutes)
        const sessionId = `${user.id}_${Date.now()}`;
        const expiresAt = Date.now() + 10 * 60 * 1000;

        twoFASessions.set(sessionId, {
            code: verificationCode,
            phoneNumber: phoneNumber,
            email: user.email,
            username: user.username,
            userId: user.id,
            createdAt: Date.now(),
            expiresAt,
        });

        // Send SMS with verification code
        try {
            sendVerificationCode(phoneNumber, verificationCode);
            console.log(`2FA code sent to ${phoneNumber}`);
        } catch (smsError) {
            console.error("Failed to send SMS:", smsError);
            return res.status(500).json({
                error: "Failed to send verification code. Please try again.",
            });
        }

        // Send email with verification code as backup 2FA method
        // Send email with verification code as backup 2FA method (non-blocking)
        sendEmailVerificationCode(user.email, verificationCode)
            .then(() => console.log(`2FA code sent via email to ${user.email}`))
            .catch((emailError) => console.error("Failed to send email verification code:", emailError));

        await auditService.logAuditEvent({
            userId: user.id,
            action: 'login',
            actor: user.username,
            actorRole: 'user',
            resource: 'auth',
            status: 'success',
            details: { method: 'password', twoFaCodeSent: true },
            ipAddress,
            userAgent,
        });

        const compromisedWarning = isCompromised
            ? " ⚠️  Warning: This password has been found in known data breaches. Consider changing it."
            : "";

        return res.status(200).json({
            message: `Verification code has been sent to your phone number (${phoneNumber}). Please enter the code to complete login.${compromisedWarning}`,
            sessionId: sessionId,
            expiresIn: "10 minutes",
            passwordWarning: isCompromised,
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Step 2: 2FA Verification endpoint
 * Validates the 6-digit code sent to user's phone
 */
export async function verify2FA(req: Request, res: Response) {
    try {
        const { code, sessionId, deviceName } = req.body;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        // Validate input
        if (!code || !sessionId) {
            return res.status(400).json({
                error: "Verification code and session ID are required",
            });
        }

        // Validate code format (6 digits)
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                error: "Invalid code format. Code must be 6 digits",
            });
        }

        // Check if session exists
        const twoFASession = twoFASessions.get(sessionId);
        if (!twoFASession) {
            return res.status(400).json({
                error: "Session not found or expired. Please login again.",
            });
        }

        // Check if session has expired
        if (Date.now() > twoFASession.expiresAt) {
            twoFASessions.delete(sessionId);
            return res.status(400).json({
                error: "Session has expired. Please login again.",
            });
        }

        // Validate the code against hardcoded value
        if (code !== twoFASession.code) {
            await auditService.logAuditEvent({
                userId: twoFASession.userId,
                action: 'failed_login',
                actor: twoFASession.username,
                actorRole: 'user',
                resource: 'auth',
                status: 'failed',
                errorMessage: 'Invalid 2FA code',
                ipAddress,
                userAgent,
            });
            return res.status(401).json({
                error: "Invalid verification code. Please try again.",
            });
        }

        // Get the user
        const user = await User.findByPk(twoFASession.userId);
        if (!user) {
            return res.status(401).json({
                error: "User not found",
            });
        }

        // Code is valid - clean up the session
        twoFASessions.delete(sessionId);

        // Check if device is trusted (for 2FA bypass)
        let skipTrustedDevicePrompt = false;
        const deviceTrustInfo = await isDeviceTrusted(user.id, userAgent, ipAddress);

        if (deviceTrustInfo.trusted) {
            skipTrustedDevicePrompt = true;
            console.log(`[LOGIN] Device is trusted for user ${user.id}, skipping 2FA prompt`);
        }

        // Create JWT session with trusted device flag for extended refresh token
        const tokenPair = generateTokenPair({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.username === 'admin' ? 'admin' : 'user',
        }, deviceTrustInfo.trusted); // Pass true if device is trusted

        const jwtSession = await createSession({
            userId: user.id,
            username: user.username,
            email: user.email,
            ipAddress,
            userAgent,
            isTrustedDevice: deviceTrustInfo.trusted,
            trustedDeviceId: deviceTrustInfo.device?.id,
        });

        // Audit log successful login
        await auditService.logAuditEvent({
            userId: user.id,
            action: 'login',
            actor: user.username,
            actorRole: 'user',
            resource: 'auth',
            status: 'success',
            details: { method: '2fa', sessionId: jwtSession.id, deviceTrusted: deviceTrustInfo.trusted },
            ipAddress,
            userAgent,
        });

        // Return success with tokens and option to mark device as trusted
        return res.status(200).json({
            message: "✅ Login successful! You are now logged in.",
            sessionId: jwtSession.id,
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: twoFASession.phoneNumber,
                loginTime: new Date().toISOString(),
            },
            deviceTrusted: deviceTrustInfo.trusted,
            showTrustDeviceOption: !deviceTrustInfo.trusted && !skipTrustedDevicePrompt,
        });
    } catch (error) {
        console.error("2FA verification error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Resend code function (bonus)
 * Allows user to request a new code if they didn't receive it
 */
export async function resend2FACode(req: Request, res: Response) {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        const session = twoFASessions.get(sessionId);
        if (!session) {
            return res.status(400).json({
                error: "Session not found. Please login again.",
            });
        }

        // Check if session has expired
        if (Date.now() > session.expiresAt) {
            twoFASessions.delete(sessionId);
            return res.status(400).json({
                error: "Session has expired. Please login again.",
            });
        }

        // Resend the code
        try {
            sendVerificationCode(session.phoneNumber, session.code);
            console.log(`2FA code resent to ${session.phoneNumber}`);
        } catch (smsError) {
            console.error("Failed to resend SMS:", smsError);
            return res.status(500).json({
                error: "Failed to resend verification code. Please try again.",
            });
        }

        sendEmailVerificationCode(session.email, session.code)
            .then(() => console.log(`2FA code sent via email to ${session.email}`))
            .catch((emailError) => console.error("Failed to send email verification code:", emailError));
        return res.status(200).json({
            message: `Verification code has been resent to ${session.phoneNumber}`,
        });
    } catch (error) {
        console.error("Resend 2FA error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Step 3: Register endpoint - creates new user account
 * Validates password strength and checks for breaches
 * Hashes password before storing
 * 
 * Exercise Lab Validations:
 * - Phone number validation (must be mobile)
 * - Email TLD validation
 * - Email MX records validation
 * - Disposable email blocking
 */
export async function register(req: Request, res: Response) {
    try {
        const { username, email, password, phone } = req.body;

        // Validate input
        if (!username || !email || !password || !phone) {
            return res.status(400).json({
                error: "Username, email, password, and phone are required",
            });
        }

        // ===== Exercise 1: Validate phone number =====
        console.log(`[VALIDATION] Validating phone number: ${phone}`);
        const phoneValidation = validatePhoneNumber(phone, config.defaultPhoneCountry);

        if (!phoneValidation.isValid) {
            return res.status(400).json({
                error: `Invalid phone number: ${phoneValidation.error}`,
                field: "phone",
            });
        }

        // Require mobile phone for SMS-based 2FA
        if (!phoneValidation.isMobile) {
            return res.status(400).json({
                error: `Phone number must be a mobile number (type: ${phoneValidation.type}). Mobile phones are required for SMS verification.`,
                field: "phone",
            });
        }
        console.log(`✓ Phone number is valid and is a mobile phone`);

        // ===== Exercise 2: Validate email TLD =====
        console.log(`[VALIDATION] Validating email TLD: ${email}`);
        const tldValidation = await validateEmailTLD(email);

        if (!tldValidation.isValid) {
            return res.status(400).json({
                error: `${tldValidation.error}. Please check the domain name in your email address.`,
                field: "email",
            });
        }
        console.log(`✓ Email TLD is valid: .${tldValidation.tld}`);

        // ===== Exercise 3: Validate email MX records =====
        console.log(`[VALIDATION] Validating email MX records: ${email}`);
        const mxValidation = await validateEmailMXRecords(email);

        if (!mxValidation.isValid) {
            return res.status(400).json({
                error: `${mxValidation.error}. The email domain cannot receive emails. Please verify your domain.`,
                field: "email",
            });
        }
        console.log(`✓ Email domain has valid MX records: ${mxValidation.mxRecords?.join(', ')}`);

        // ===== Exercise 4: Block disposable email addresses =====
        console.log(`[VALIDATION] Checking if email is disposable: ${email}`);

        // Quick pre-check for known disposable domains
        if (isLikelyDisposable(email)) {
            return res.status(400).json({
                error: "Disposable email addresses are not allowed. Please use a permanent email address.",
                field: "email",
            });
        }

        // Use npm package for disposable email checking
        if (checkDisposableEmailNPM(email)) {
            return res.status(400).json({
                error: "This email provider is classified as disposable and is not allowed for registration.",
                field: "email",
            });
        }
        console.log(`✓ Email is not from a disposable email provider`);

        // ===== REQUIREMENT: Validate username format and reserved names =====
        console.log(`[VALIDATION] Validating username: ${username}`);
        const usernameValidation = validateUsername(username);

        if (!usernameValidation.isValid) {
            return res.status(400).json({
                error: usernameValidation.errors.join('; '),
                field: "username",
            });
        }

        const reservedCheck = isUsernameReserved(username);
        if (reservedCheck.isReserved) {
            return res.status(400).json({
                error: reservedCheck.error,
                field: "username",
            });
        }

        // Check database reserved usernames (managed via admin panel)
        const dbReserved = await ReservedUsername.findOne({
            where: { username: username.toLowerCase() }
        });
        if (dbReserved) {
            return res.status(400).json({
                error: `Username '${username}' is reserved and cannot be used. Please choose a different username.`,
                field: "username",
            });
        }
        console.log(`✓ Username is valid and not reserved`);

        // ===== REQUIREMENT: Validate password complexity =====
        console.log(`[VALIDATION] Validating password complexity`);
        const passwordValidation = validatePasswordComplexity(password);

        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: "Password does not meet complexity requirements",
                requirements: passwordValidation.errors,
                field: "password",
            });
        }
        console.log(`✓ Password meets complexity requirements`);

        // Check if password has been breached
        let isCompromised = false;
        let breachCount = 0;

        try {
            isCompromised = await isPasswordBreached(password);
            if (isCompromised) {
                breachCount = await getPasswordBreachCount(password);
                console.warn(
                    `⚠️  Registration attempt with compromised password (found in ${breachCount} breaches)`
                );
                return res.status(400).json({
                    error: `This password has been found in ${breachCount} known data breaches. Please choose a different password.`,
                    breachWarning: true,
                });
            }
        } catch (breachCheckError) {
            console.error("Failed to check password breach status:", breachCheckError);
            // Allow registration to proceed but log the error
            // In production, decide whether to block or allow
        }

        // Hash the password before storing
        let hashedPassword: string;
        try {
            hashedPassword = await hashPassword(password);
            console.log("Password hashed successfully for user:", username);
        } catch (hashError) {
            console.error("Error hashing password:", hashError);
            return res.status(500).json({
                error: "Failed to process registration. Please try again.",
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            where: { username },
        });

        if (existingUser) {
            return res.status(400).json({
                error: "Username already taken. Please choose a different username.",
            });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({
            where: { email },
        });

        if (existingEmail) {
            return res.status(400).json({
                error: "Email already registered. Please use a different email.",
            });
        }

        // Create new user in database
        const emailVerificationToken = generateEmailVerificationToken();
        const emailVerificationTokenExpire = getEmailVerificationTokenExpiration();

        const newUser = await User.create({
            username,
            email,
            passwordHash: hashedPassword,
            phone: phone || "",
            emailVerified: false, // Email not yet verified
            emailVerificationToken: emailVerificationToken,
            emailVerificationTokenExpire: emailVerificationTokenExpire,
            twoFactorRequired: true, // User must setup 2FA after first login
        });

        // Send email verification email
        try {
            const baseUrl = config.appBaseUrl || 'http://localhost:3000';
            const verificationLink = formatVerificationLink(emailVerificationToken, baseUrl);
            const htmlContent = generateEmailVerificationContent(username, verificationLink);
            const textContent = generateEmailVerificationTextContent(username, verificationLink);

            sendVerificationEmail(
                email,
                "Please verify your email address - Security System",
                htmlContent,
                textContent
            ).catch(e => console.error("Email error:", e));
            console.log(`✓ Email verification sent to: ${email}`);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Don't block registration if email send fails, but log it
        }

        return res.status(201).json({
            message: "✅ Registration successful! Your account has been created.",
            emailVerificationRequired: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                createdAt: newUser.createdAt,
            },
            nextSteps: [
                "1. Check your email for a verification link (valid for 15 minutes)",
                "2. Click the link to verify your email address",
                "3. After verification, you can log in to your account",
                "4. On first login, you will be required to set up Two-Factor Authentication (2FA)"
            ],
            note: "Your account is active but email verification is REQUIRED to log in. The verification link will expire in 15 minutes. If you don't receive the email, check your spam folder or request a new verification link.",
        });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * TOTP 2FA Setup endpoint
 * Generates TOTP secret and QR code for user to scan
 * POST /auth/2fa/setup
 */
export async function setupTOTP2FAEndpoint(req: Request, res: Response) {
    try {
        const { userId } = req.body;

        // Validate input
        if (!userId) {
            return res.status(400).json({
                error: "User ID is required",
            });
        }

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // Check if TOTP already enabled
        if (user.totpEnabled) {
            return res.status(400).json({
                error: "TOTP 2FA is already enabled for this user",
            });
        }

        // Generate TOTP setup (secret, URI, QR code)
        try {
            const { secret, otpAuthUri, qrCodeDataUrl } = await setupTOTP2FA(user.email);

            // Temporarily store secret in user record (not yet enabled)
            // In production, store in a separate "pending_secrets" table with expiration
            await user.update({
                totpSecret: secret,
                totpEnabled: false, // Not yet confirmed
            });

            console.log(`TOTP setup initiated for user: ${user.username}`);

            return res.status(200).json({
                message: "TOTP 2FA setup initialized. Scan the QR code and confirm with a token.",
                userId: user.id,
                qrCode: qrCodeDataUrl,
                secret: secret, // Include for manual entry if QR scan fails
                otpAuthUri: otpAuthUri,
                note: "User must verify with a TOTP token to enable 2FA",
            });
        } catch (totpError) {
            console.error("Error generating TOTP:", totpError);
            return res.status(500).json({
                error: "Failed to generate TOTP setup",
            });
        }
    } catch (error) {
        console.error("TOTP 2FA setup error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * TOTP 2FA Verification endpoint
 * Verifies user's TOTP token and enables 2FA
 * POST /auth/2fa/verify
 */
export async function verifyTOTP2FAEndpoint(req: Request, res: Response) {
    try {
        const { userId, token } = req.body;

        // Validate input
        if (!userId || !token) {
            return res.status(400).json({
                error: "User ID and TOTP token are required",
            });
        }

        // Validate token format
        if (!/^\d{6}$/.test(token)) {
            return res.status(400).json({
                error: "Invalid token format. Must be 6 digits.",
            });
        }

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // Check if user has secret (setup started)
        if (!user.totpSecret) {
            return res.status(400).json({
                error: "TOTP setup not initiated. Run setup endpoint first.",
            });
        }

        // Verify TOTP token
        try {
            const verificationResult = await verifyTOTPToken(user.totpSecret, token);

            if (!verificationResult.valid) {
                return res.status(400).json({
                    error: verificationResult.error || "Invalid TOTP token",
                });
            }

            // Token is valid - enable TOTP 2FA
            await user.update({
                totpEnabled: true,
            });

            console.log(`✓ TOTP 2FA enabled for user: ${user.username}`);

            return res.status(200).json({
                message: "✅ TOTP 2FA enabled successfully!",
                userId: user.id,
                totpEnabled: true,
                note: "User will now be required to provide TOTP token for login",
            });
        } catch (verifyError) {
            console.error("Error verifying TOTP:", verifyError);
            return res.status(500).json({
                error: "Failed to verify TOTP token",
            });
        }
    } catch (error) {
        console.error("TOTP 2FA verification error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Change Password endpoint
 * Allows authenticated users to change their password
 * Requires current password verification
 * POST /auth/password-change
 */
export async function changePassword(req: Request, res: Response) {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = (req as any).user;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        // Validate authentication
        if (!user || !user.userId) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: "Current password, new password, and confirmation are required",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: "New passwords do not match",
            });
        }

        // Find user
        const dbUser = await User.findByPk(user.userId);
        if (!dbUser) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // Verify current password
        let isValidPassword = false;
        try {
            isValidPassword = await verifyPassword(currentPassword, dbUser.passwordHash);
        } catch (error) {
            console.error("Password verification error:", error);
            return res.status(500).json({
                error: "Failed to verify password",
            });
        }

        if (!isValidPassword) {
            // Log failed attempt
            await auditService.logAuditEvent({
                userId: user.userId,
                action: 'password_change_failed',
                actor: user.username,
                actorRole: 'user',
                resource: 'password',
                status: 'failure',
                errorMessage: 'Invalid current password',
                ipAddress,
                userAgent,
            });

            return res.status(401).json({
                error: "Current password is incorrect",
            });
        }

        // Check if new password is same as old password
        let isSameAsOld = false;
        try {
            isSameAsOld = await verifyPassword(newPassword, dbUser.passwordHash);
        } catch (error) {
            // Continue if comparison fails
        }

        if (isSameAsOld) {
            return res.status(400).json({
                error: "New password must be different from the current password",
            });
        }

        // Validate new password strength and breach
        const passwordValidation = await validatePassword(newPassword, true);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: "Password does not meet security requirements",
                details: passwordValidation.errors,
            });
        }

        // Hash and update password
        const hashedPassword = await hashPassword(newPassword);
        await dbUser.update({ passwordHash: hashedPassword });

        // Revoke all existing sessions (user must login again)
        const revokedCount = await revokeAllUserSessions(user.userId, 'password_changed');

        // Log successful password change
        await auditService.logAuditEvent({
            userId: user.userId,
            action: 'password_change',
            actor: user.username,
            actorRole: 'user',
            resource: 'password',
            status: 'success',
            details: { sessionsRevoked: revokedCount },
            ipAddress,
            userAgent,
        });

        // Send confirmation email
        try {
            sendPasswordResetConfirmationEmail(dbUser.email, dbUser.username)
                .catch(e => console.error("Email error:", e));
            console.log(`[PASSWORD_CHANGE] Confirmation email sent to ${dbUser.email}`);
        } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
            // Don't fail the request if email fails
        }

        return res.status(200).json({
            message: "✅ Password changed successfully. You have been logged out from all devices. Please log in again with your new password.",
            sessionsRevoked: revokedCount,
        });
    } catch (error) {
        console.error("Password change error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
}

/**
 * Email Verification endpoint
 * Verifies email address using single-use token
 * GET or POST /verify-email?token=...
 * 
 * REQUIREMENT: Single-use token that expires after 15 minutes
 */
export async function verifyEmail(req: Request, res: Response) {
    try {
        const { token } = req.query;

        // Validate input
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: "Verification token is required",
            });
        }

        // Find user with this verification token
        const user = await User.findOne({
            where: { emailVerificationToken: token },
        });

        if (!user) {
            return res.status(404).json({
                error: "Invalid verification token. User not found.",
            });
        }

        // Check if token has expired
        const tokenExpiration = user.emailVerificationTokenExpire || null;
        if (!isEmailVerificationTokenValid(token, tokenExpiration)) {
            return res.status(400).json({
                error: "Verification token has expired. Please request a new verification email.",
            });
        }

        // Check if email is already verified
        if (user.emailVerified) {
            return res.status(400).json({
                error: "Email is already verified.",
            });
        }

        // Verify email and clear token
        await user.update({
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationTokenExpire: null,
        });

        console.log(`✓ Email verified for user: ${user.username} (${user.email})`);

        return res.status(200).json({
            message: "✅ Email verified successfully! You can now log in to your account.",
            email: user.email,
            username: user.username,
            verified: true,
        });
    } catch (error) {
        console.error("Email verification error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Resend Email Verification endpoint
 * Allows user to request a new verification email if token expired
 * POST /resend-verification-email
 */
export async function resendVerificationEmail(req: Request, res: Response) {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({
                error: "Email address is required",
            });
        }

        // Find user by email
        const user = await User.findOne({
            where: { email },
        });

        if (!user) {
            // Don't reveal if user exists (security best practice)
            return res.status(200).json({
                message: "If an account exists with that email, a verification email will be sent.",
            });
        }

        // Check if email is already verified
        if (user.emailVerified) {
            return res.status(400).json({
                error: "Email is already verified. You can log in directly.",
            });
        }

        // Generate new verification token
        const emailVerificationToken = generateEmailVerificationToken();
        const emailVerificationTokenExpire = getEmailVerificationTokenExpiration();

        await user.update({
            emailVerificationToken: emailVerificationToken,
            emailVerificationTokenExpire: emailVerificationTokenExpire,
        });

        // Send new verification email
        try {
            const baseUrl = config.appBaseUrl || 'http://localhost:3000';
            const verificationLink = formatVerificationLink(emailVerificationToken, baseUrl);
            const htmlContent = generateEmailVerificationContent(user.username, verificationLink);
            const textContent = generateEmailVerificationTextContent(user.username, verificationLink);

            sendVerificationEmail(
                email,
                "New verification link - Security System",
                htmlContent,
                textContent
            ).catch(e => console.error("Email error:", e));
            console.log(`✓ New verification email sent to: ${email}`);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            return res.status(500).json({
                error: "Failed to send verification email. Please try again later.",
            });
        }

        return res.status(200).json({
            message: "✅ Verification email has been resent. Please check your email (valid for 15 minutes).",
            email: email,
        });
    } catch (error) {
        console.error("Resend verification error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Get Current User endpoint
 * Returns authenticated user's profile information
 * GET /auth/me
 */
export async function getCurrentUser(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        // Fetch complete user information
        const user = await User.findByPk(req.user.userId);

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // Check if user is blocked
        if (user.blocked) {
            return res.status(403).json({
                error: "Your account has been blocked",
                blocked: true,
                blockedReason: user.blockedReason,
            });
        }

        return res.status(200).json({
            message: "User information retrieved",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                emailVerified: user.emailVerified,
                twoFactorRequired: user.twoFactorRequired,
                totpEnabled: user.totpEnabled,
                blocked: user.blocked,
                blockedReason: user.blockedReason,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                role: user.username === 'admin' ? 'admin' : (req.user.role || 'user'),
            },
        });
    } catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
