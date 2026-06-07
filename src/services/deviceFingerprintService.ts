/**
 * Device Fingerprinting Service
 * Creates unique device identifiers for trusted device management
 */

import crypto from 'crypto';
import * as UAParser from 'ua-parser-js';
import { Request } from 'express';

interface DeviceFingerprint {
    userAgent: string;
    ipAddress: string;
    deviceHash: string;
    deviceName: string;
}

/**
 * Generate a device fingerprint from request data
 */
export function generateDeviceFingerprint(
    userAgent: string,
    ipAddress: string
): DeviceFingerprint {
    // Create a stable hash from user agent and IP
    const fingerprintData = `${userAgent}:${ipAddress}`;
    const deviceHash = crypto.createHash('sha256').update(fingerprintData).digest('hex');

    // Parse user agent for device name
    const parser = new UAParser.UAParser(userAgent);
    const result = parser.getResult();
    const deviceName = formatDeviceName(result);

    return {
        userAgent,
        ipAddress,
        deviceHash,
        deviceName,
    };
}

/**
 * Generate device fingerprint from Express request
 */
export function generateDeviceFingerprintFromRequest(req: Request): DeviceFingerprint {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = getClientIP(req);
    return generateDeviceFingerprint(userAgent, ipAddress);
}

/**
 * Format device name from user agent info
 */
function formatDeviceName(uaResult: any): string {
    const browser = uaResult.browser?.name || 'Unknown Browser';
    const os = uaResult.os?.name || 'Unknown OS';
    const deviceType = uaResult.device?.type || 'Desktop';

    return `${browser} on ${os} (${deviceType})`;
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.connection.remoteAddress || 'unknown';
}

/**
 * Create a simple device identifier combining browser and OS
 */
export function createSimpleDeviceId(userAgent: string): string {
    const parser = new UAParser.UAParser(userAgent);
    const result = parser.getResult();

    const browserName = result.browser?.name || 'unknown';
    const osName = result.os?.name || 'unknown';
    const deviceType = result.device?.type || 'desktop';

    return `${browserName}_${osName}_${deviceType}`.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Check if device fingerprint matches (for verifying trusted device)
 */
export function verifyDeviceFingerprint(
    storedHash: string,
    currentUserAgent: string,
    currentIpAddress: string
): boolean {
    const currentFingerprint = generateDeviceFingerprint(currentUserAgent, currentIpAddress);
    return storedHash === currentFingerprint.deviceHash;
}
