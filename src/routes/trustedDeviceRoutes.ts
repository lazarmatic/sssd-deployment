/**
 * Trusted Device Routes
 * Handles device trust management and 2FA bypass
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware';
import * as auditService from '../services/auditService';
import {
    markDeviceAsTrusted,
    getUserTrustedDevices,
    revokeTrustedDevice,
    formatDeviceInfo,
} from '../services/trustedDeviceService';
import TrustedDevice from '../models/TrustedDevice';

const router = Router();

/**
 * Mark current device as trusted
 * POST /auth/trusted-devices/mark
 */
router.post('/mark', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { deviceName } = req.body;
        const user = (req as any).user;
        const userAgent = auditService.getUserAgent(req);
        const ipAddress = auditService.getClientIP(req);

        if (!user) {
            return res.status(401).json({
                error: 'Not authenticated',
            });
        }

        if (deviceName && typeof deviceName !== 'string') {
            return res.status(400).json({
                error: 'Device name must be a string',
            });
        }

        try {
            const device = await markDeviceAsTrusted({
                userId: user.userId || user.id,
                userAgent,
                ipAddress,
                deviceName,
            });

            // Audit log
            await auditService.logAuditEvent({
                userId: user.userId || user.id,
                action: 'trusted_device_marked',
                actor: 'user',
                actorRole: 'user',
                resource: 'trusted_device',
                resourceId: device.id,
                status: 'success',
                details: { deviceName: device.deviceName, expiresAt: device.expiresAt },
                ipAddress,
                userAgent,
            });

            res.status(201).json({
                message: 'Device marked as trusted',
                device: {
                    id: device.id,
                    name: device.deviceName,
                    expiresAt: device.expiresAt,
                },
            });
        } catch (error) {
            console.error('Failed to mark device:', error);
            res.status(500).json({
                error: 'Failed to mark device as trusted',
            });
        }
    } catch (error) {
        console.error('Trusted device marking error:', error);
        res.status(500).json({
            error: 'Failed to process request',
        });
    }
});

/**
 * Get all trusted devices for authenticated user
 * GET /auth/trusted-devices
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                error: 'Not authenticated',
            });
        }

        const devices = await getUserTrustedDevices(user.userId || user.id);

        const formattedDevices = devices.map(device => ({
            id: device.id,
            name: device.deviceName,
            createdAt: device.createdAt,
            expiresAt: device.expiresAt,
            lastUsedAt: device.lastUsedAt,
            daysUntilExpiration: formatDeviceInfo(device).daysUntilExpiration,
        }));

        res.status(200).json({
            devices: formattedDevices,
            count: formattedDevices.length,
        });
    } catch (error) {
        console.error('Failed to get trusted devices:', error);
        res.status(500).json({
            error: 'Failed to retrieve trusted devices',
        });
    }
});

/**
 * Revoke a trusted device
 * DELETE /auth/trusted-devices/:deviceId
 */
router.delete('/:deviceId', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { deviceId } = req.params;
        const user = (req as any).user;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        if (!user) {
            return res.status(401).json({
                error: 'Not authenticated',
            });
        }

        // Verify device belongs to user
        const device = await TrustedDevice.findByPk(deviceId as string);

        if (!device) {
            return res.status(404).json({
                error: 'Device not found',
            });
        }

        if (device.userId !== (user.userId || user.id)) {
            return res.status(403).json({
                error: 'Device does not belong to you',
            });
        }

        // Revoke device
        await revokeTrustedDevice(deviceId as string);

        // Audit log
        await auditService.logAuditEvent({
            userId: user.userId || user.id,
            action: 'trusted_device_revoked',
            actor: 'user',
            actorRole: 'user',
            resource: 'trusted_device',
            resourceId: deviceId as string,
            status: 'success',
            details: { deviceName: device.deviceName },
            ipAddress,
            userAgent,
        });

        res.status(200).json({
            message: 'Device has been revoked',
        });
    } catch (error) {
        console.error('Failed to revoke device:', error);
        res.status(500).json({
            error: 'Failed to revoke device',
        });
    }
});

/**
 * Revoke all devices
 * POST /auth/trusted-devices/revoke-all
 */
router.post('/revoke-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const ipAddress = auditService.getClientIP(req);
        const userAgent = auditService.getUserAgent(req);

        if (!user) {
            return res.status(401).json({
                error: 'Not authenticated',
            });
        }

        // Revoke all user devices
        const revokedCount = await TrustedDevice.update(
            { revokedAt: new Date() },
            {
                where: {
                    userId: user.userId || user.id,
                    revokedAt: null,
                },
            }
        );

        // Audit log
        await auditService.logAuditEvent({
            userId: user.userId || user.id,
            action: 'all_trusted_devices_revoked',
            actor: 'user',
            actorRole: 'user',
            resource: 'trusted_device',
            status: 'success',
            details: { revokedCount: revokedCount[0] },
            ipAddress,
            userAgent,
        });

        res.status(200).json({
            message: `${revokedCount[0]} device(s) have been revoked`,
        });
    } catch (error) {
        console.error('Failed to revoke all devices:', error);
        res.status(500).json({
            error: 'Failed to revoke devices',
        });
    }
});

export default router;
