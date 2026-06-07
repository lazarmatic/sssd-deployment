/**
 * Audit Logging Service
 * Centralized logging for security-relevant events
 */

import AuditLog from '../models/AuditLog';
import { Request } from 'express';
import * as UAParser from 'ua-parser-js';

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.connection.remoteAddress || 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
}

/**
 * Parse user agent to get browser/OS details
 */
export function parseUserAgent(userAgent: string): string {
    try {
        const parser = new UAParser.UAParser();
        const result = parser.setUA(userAgent).getResult();
        return `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'} (${result.device.type || 'desktop'})`;
    } catch {
        return userAgent;
    }
}

interface AuditEventOptions {
    userId?: string | null;
    action: string;
    actor: string;
    actorRole?: string;
    resource: string;
    resourceId?: string | null;
    ipAddress?: string;
    userAgent?: string;
    details?: object | null;
    originalObject?: object | null;
    newObject?: object | null;
    status?: string;
    errorMessage?: string | null;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(options: AuditEventOptions): Promise<AuditLog> {
    try {
        const auditLog = await AuditLog.create({
            userId: options.userId || null,
            action: options.action,
            actor: options.actor,
            actorRole: options.actorRole || 'user',
            resource: options.resource,
            resourceId: options.resourceId || null,
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            details: options.details || null,
            originalObject: options.originalObject || null,
            newObject: options.newObject || null,
            status: options.status || 'success',
            errorMessage: options.errorMessage || null,
        });

        // Log to console for visibility
        console.log(`[AUDIT] ${options.action} | ${options.actor} | ${options.resource} | ${options.status || 'success'}`);

        return auditLog;
    } catch (error) {
        console.error('Failed to log audit event:', error);
        throw error;
    }
}

/**
 * Helper functions for common audit events
 */

export async function logLogin(
    userId: string,
    username: string,
    ipAddress: string,
    userAgent: string,
    method: string = 'password'
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'login',
        actor: username,
        actorRole: 'user',
        resource: 'authentication',
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { method },
        status: 'success',
    });
}

export async function logFailedLogin(
    usernameOrEmail: string,
    ipAddress: string,
    userAgent: string,
    reason: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId: null,
        action: 'failed_login',
        actor: usernameOrEmail || 'anonymous',
        actorRole: 'user',
        resource: 'authentication',
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { reason },
        status: 'failure',
        errorMessage: reason,
    });
}

export async function logLogout(
    userId: string,
    username: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'logout',
        actor: username,
        actorRole: 'user',
        resource: 'authentication',
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        status: 'success',
    });
}

export async function logRegistration(
    userId: string,
    username: string,
    email: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'registration',
        actor: username,
        actorRole: 'user',
        resource: 'user',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        newObject: { username, email },
        status: 'success',
    });
}

export async function logEmailVerification(
    userId: string,
    username: string,
    email: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'email_verification',
        actor: username,
        actorRole: 'user',
        resource: 'user',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { email },
        status: 'success',
    });
}

export async function log2FASetup(
    userId: string,
    username: string,
    method: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: '2fa_setup',
        actor: username,
        actorRole: 'user',
        resource: 'authentication',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { method },
        status: 'success',
    });
}

export async function log2FAVerification(
    userId: string,
    username: string,
    method: string,
    ipAddress: string,
    userAgent: string,
    success: boolean = true
): Promise<AuditLog> {
    return logAuditEvent({
        userId: success ? userId : null,
        action: '2fa_verification',
        actor: username,
        actorRole: 'user',
        resource: 'authentication',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { method },
        status: success ? 'success' : 'failure',
    });
}

export async function logPasswordChange(
    userId: string,
    username: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'password_change',
        actor: username,
        actorRole: 'user',
        resource: 'user',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        status: 'success',
    });
}

export async function logPasswordReset(
    userId: string,
    username: string,
    ipAddress: string,
    userAgent: string,
    success: boolean = true
): Promise<AuditLog> {
    return logAuditEvent({
        userId: success ? userId : null,
        action: 'password_reset',
        actor: username,
        actorRole: 'user',
        resource: 'user',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        status: success ? 'success' : 'failure',
    });
}

export async function logSSOAuthentication(
    userId: string,
    username: string,
    provider: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'sso_login',
        actor: username,
        actorRole: 'user',
        resource: 'authentication',
        resourceId: userId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { provider },
        status: 'success',
    });
}

export async function logTrustedDeviceMarked(
    userId: string,
    username: string,
    deviceName: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'trusted_device_marked',
        actor: username,
        actorRole: 'user',
        resource: 'device',
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { deviceName },
        status: 'success',
    });
}

export async function logTrustedDeviceRevoked(
    userId: string,
    username: string,
    deviceName: string,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId,
        action: 'trusted_device_revoked',
        actor: username,
        actorRole: 'user',
        resource: 'device',
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { deviceName },
        status: 'success',
    });
}

export async function logAdminAction(
    adminId: string,
    adminUsername: string,
    action: string,
    targetUserId: string | null,
    targetUsername: string,
    details: object | null,
    ipAddress: string,
    userAgent: string
): Promise<AuditLog> {
    return logAuditEvent({
        userId: adminId,
        action,
        actor: adminUsername,
        actorRole: 'admin',
        resource: 'user',
        resourceId: targetUserId,
        ipAddress,
        userAgent: parseUserAgent(userAgent),
        details: { targetUsername, ...details },
        status: 'success',
    });
}
