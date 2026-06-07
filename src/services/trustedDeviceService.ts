/**
 * Trusted Device Service
 * Manages trusted device registration, verification, and expiration
 */

import TrustedDevice from '../models/TrustedDevice';
import { generateDeviceFingerprint, verifyDeviceFingerprint } from './deviceFingerprintService';
import { Op } from 'sequelize';

interface TrustedDeviceOptions {
    userId: string;
    userAgent: string;
    ipAddress: string;
    deviceName?: string;
}

/**
 * Mark device as trusted for user
 */
export async function markDeviceAsTrusted(options: TrustedDeviceOptions): Promise<TrustedDevice> {
    const fingerprint = generateDeviceFingerprint(options.userAgent, options.ipAddress);

    // Device expires in 10 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const trustedDevice = await TrustedDevice.create({
        userId: options.userId,
        deviceIdentifier: fingerprint.deviceHash,
        deviceName: options.deviceName || fingerprint.deviceName,
        userAgent: options.userAgent,
        ipAddress: options.ipAddress,
        expiresAt,
    });

    console.log(`[TRUSTED_DEVICE] Device marked as trusted for user ${options.userId}`);
    return trustedDevice;
}

/**
 * Check if device is trusted for user
 */
export async function isDeviceTrusted(
    userId: string,
    userAgent: string,
    ipAddress: string
): Promise<{ trusted: boolean; device?: TrustedDevice }> {
    try {
        const fingerprint = generateDeviceFingerprint(userAgent, ipAddress);

        // Find matching trusted device
        const device = await TrustedDevice.findOne({
            where: {
                userId,
                deviceIdentifier: fingerprint.deviceHash,
                revokedAt: null,
            },
        });

        if (!device) {
            return { trusted: false };
        }

        // Check if device has expired
        if (new Date() > device.expiresAt) {
            return { trusted: false };
        }

        // Update last used time
        await device.update({ lastUsedAt: new Date() });

        return { trusted: true, device };
    } catch (error) {
        console.error('Failed to check trusted device:', error);
        return { trusted: false };
    }
}

/**
 * Get all trusted devices for user
 */
export async function getUserTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    try {
        const devices = await TrustedDevice.findAll({
            where: {
                userId,
                revokedAt: null,
            },
            order: [['createdAt', 'DESC']],
        });

        // Filter out expired devices
        return devices.filter(d => new Date() < d.expiresAt);
    } catch (error) {
        console.error('Failed to get trusted devices:', error);
        return [];
    }
}

/**
 * Revoke a specific trusted device
 */
export async function revokeTrustedDevice(deviceId: string): Promise<void> {
    try {
        const device = await TrustedDevice.findByPk(deviceId);
        if (device) {
            await device.update({ revokedAt: new Date() });
            console.log(`[TRUSTED_DEVICE] Device ${deviceId} revoked`);
        }
    } catch (error) {
        console.error('Failed to revoke device:', error);
    }
}

/**
 * Revoke all trusted devices for user
 */
export async function revokAllUserTrustedDevices(userId: string): Promise<number> {
    try {
        const result = await TrustedDevice.update(
            { revokedAt: new Date() },
            { where: { userId, revokedAt: null } }
        );

        console.log(`[TRUSTED_DEVICE] Revoked ${result[0]} devices for user ${userId}`);
        return result[0];
    } catch (error) {
        console.error('Failed to revoke user devices:', error);
        return 0;
    }
}

/**
 * Cleanup expired trusted devices
 */
export async function cleanupExpiredTrustedDevices(): Promise<number> {
    try {
        const result = await TrustedDevice.destroy({
            where: {
                expiresAt: {
                    [Op.lt]: new Date(),
                },
            },
        });

        console.log(`[TRUSTED_DEVICE] Cleaned up ${result} expired devices`);
        return result;
    } catch (error) {
        console.error('Failed to cleanup expired devices:', error);
        return 0;
    }
}

/**
 * Get device info in user-friendly format
 */
export function formatDeviceInfo(device: TrustedDevice): {
    name: string;
    createdAt: Date;
    expiresAt: Date;
    lastUsedAt: Date | null;
    daysUntilExpiration: number;
} {
    const daysUntilExpiration = Math.ceil(
        (device.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
        name: device.deviceName || 'Unknown Device',
        createdAt: device.createdAt,
        expiresAt: device.expiresAt,
        lastUsedAt: device.lastUsedAt || null,
        daysUntilExpiration: Math.max(0, daysUntilExpiration),
    };
}
