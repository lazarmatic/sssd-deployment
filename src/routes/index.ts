import { Router, Request, Response } from "express";
import { login, verify2FA, resend2FACode, register, setupTOTP2FAEndpoint, verifyTOTP2FAEndpoint, verifyEmail, resendVerificationEmail, changePassword, getCurrentUser } from "../controllers/authController";
import { isAuthenticated } from "../middlewares/authMiddleware";
import sessionRoutes from "./sessionRoutes";
import adminRoutes from "./adminRoutes";
import passwordRecoveryRoutes from "./passwordRecoveryRoutes";
import trustedDeviceRoutes from "./trustedDeviceRoutes";
import oauthRoutes from "./oauthRoutes";

const router = Router();

// Health check endpoint
router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

// Register endpoint - creates new user with password hashing and breach checking
router.post("/register", register);

// Email verification endpoint - verifies email with single-use token (valid for 15 minutes)
router.get("/verify-email", verifyEmail);
router.post("/verify-email", verifyEmail);

// Resend verification email endpoint
router.post("/resend-verification-email", resendVerificationEmail);

// Password change endpoint - authenticated users only
router.post("/auth/password-change", isAuthenticated, changePassword);

// Login endpoint - validates credentials and sends 2FA code via SMS
router.post("/auth/login", login);

// 2FA Verification endpoint - validates the 6-digit code
router.post("/auth/2fa", verify2FA);

router.post("/auth/2fa/resend", resend2FACode);

// TOTP 2FA Setup endpoint - generates TOTP secret and QR code
router.post("/auth/totp/setup", setupTOTP2FAEndpoint);

// TOTP 2FA Verification endpoint - verifies TOTP token and enables 2FA
router.post("/auth/totp/verify", verifyTOTP2FAEndpoint);

// Get current user endpoint - authenticated users only
router.get("/auth/me", isAuthenticated, getCurrentUser);

// Session management routes
router.use("/session", sessionRoutes);

// Admin routes
router.use("/admin", adminRoutes);

// Password recovery routes
router.use("/password-recovery", passwordRecoveryRoutes);

// Trusted device routes
router.use("/trusted-devices", trustedDeviceRoutes);

// OAuth routes
router.use("/oauth", oauthRoutes);

export default router;