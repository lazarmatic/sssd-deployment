/**
 * Admin Routes
 * Admin dashboard endpoints for audit logs, user management, etc.
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/authMiddleware';
import AuditLog from '../models/AuditLog';
import User from '../models/User';
import TrustedDevice from '../models/TrustedDevice';
import ReservedUsername from '../models/ReservedUsername';
import { Op } from 'sequelize';
import sequelize from '../config/database';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * GET /admin/audit-logs/stats
 * Get audit log statistics
 */
router.get('/audit-logs/stats', async (req: Request, res: Response) => {
    try {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const dateWhere = { created_at: { [Op.gte]: last24Hours } } as any;

        // Count by action
        const actionStats = await AuditLog.findAll({
            attributes: ['action', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: dateWhere,
            group: ['action'],
            raw: true,
        });

        // Count by status
        const statusStats = await AuditLog.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: dateWhere,
            group: ['status'],
            raw: true,
        });

        const failedLogins = await AuditLog.count({
            where: {
                action: 'failed_login',
                created_at: { [Op.gte]: last24Hours },
            } as any,
        });

        const successfulLogins = await AuditLog.count({
            where: {
                action: 'login',
                created_at: { [Op.gte]: last24Hours },
            } as any,
        });

        return res.status(200).json({
            message: 'Audit statistics retrieved',
            period: 'Last 24 hours',
            stats: {
                actionBreakdown: actionStats,
                statusBreakdown: statusStats,
                failedLogins,
                successfulLogins,
                totalEvents: failedLogins + successfulLogins,
            },
        });
    } catch (error) {
        console.error('Get audit stats error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve audit statistics',
        });
    }
});

/**
 * GET /admin/audit-logs
 * Retrieve audit logs with filtering and pagination
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            actor,
            resource,
            status,
            userId,
            startDate,
            endDate,
            ipAddress,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
        const offset = (pageNum - 1) * limitNum;

        // Build filter conditions
        const where: any = {};

        if (action) where.action = action;
        if (actor) where.actor = { [Op.like]: `%${actor}%` };
        if (resource) where.resource = resource;
        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (ipAddress) where.ipAddress = ipAddress;

        // Date range filtering — use snake_case to match underscored: true
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at[Op.gte] = new Date(startDate as string);
            if (endDate) where.created_at[Op.lte] = new Date(endDate as string);
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset,
        });

        return res.status(200).json({
            message: 'Audit logs retrieved',
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                pages: Math.ceil(count / limitNum),
            },
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve audit logs',
        });
    }
});

/**
 * GET /admin/users/:userId/audit
 * Get audit logs for a specific user
 */
router.get('/users/:userId/audit', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
        const offset = (pageNum - 1) * limitNum;

        // Verify user exists
        const user = await User.findByPk(userId as string);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where: { userId },
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset,
        });

        return res.status(200).json({
            message: 'User audit logs retrieved',
            user: { id: user.id, username: user.username, email: user.email },
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                pages: Math.ceil(count / limitNum),
            },
        });
    } catch (error) {
        console.error('Get user audit logs error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve user audit logs',
        });
    }
});

/**
 * GET /admin/users/:userId/trusted-devices
 * Get trusted devices for a user
 */
router.get('/users/:userId/trusted-devices', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Verify user exists
        const user = await User.findByPk(userId as string);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        const devices = await TrustedDevice.findAll({
            where: { userId },
            order: [['created_at', 'DESC']],
        });

        return res.status(200).json({
            message: 'Trusted devices retrieved',
            user: { id: user.id, username: user.username, email: user.email },
            devices: devices.map(d => ({
                id: d.id,
                deviceName: d.deviceName,
                userAgent: d.userAgent,
                ipAddress: d.ipAddress,
                createdAt: d.createdAt,
                lastUsedAt: d.lastUsedAt,
                expiresAt: d.expiresAt,
                isExpired: new Date() > d.expiresAt,
                isRevoked: !!d.revokedAt,
            })),
        });
    } catch (error) {
        console.error('Get trusted devices error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve trusted devices',
        });
    }
});

/**
 * DELETE /admin/trusted-devices/:deviceId
 * Revoke a trusted device
 */
router.delete('/trusted-devices/:deviceId', async (req: Request, res: Response) => {
    try {
        const { deviceId } = req.params;

        const device = await TrustedDevice.findByPk(deviceId as string);
        if (!device) {
            return res.status(404).json({
                error: 'Device not found',
            });
        }

        // Revoke the device
        await device.update({ revokedAt: new Date() });

        return res.status(200).json({
            message: 'Device revoked successfully',
        });
    } catch (error) {
        console.error('Revoke device error:', error);
        return res.status(500).json({
            error: 'Failed to revoke device',
        });
    }
});

/**
 * GET /admin/users
 * List all users with pagination
 */
router.get('/users', async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, search, blocked } = req.query;

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
        const offset = (pageNum - 1) * limitNum;

        const where: any = {};

        if (search) {
            where[Op.or] = [
                { username: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ];
        }

        if (blocked !== undefined) {
            where.blocked = blocked === 'true';
        }

        const { count, rows } = await User.findAndCountAll({
            attributes: {
                exclude: ['passwordHash', 'emailVerificationToken', 'totpSecret'],
            },
            where,
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset,
        });

        return res.status(200).json({
            message: 'Users retrieved',
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                pages: Math.ceil(count / limitNum),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve users',
        });
    }
});

/**
 * PATCH /admin/users/:userId/block
 * Block a user
 */
router.patch('/users/:userId/block', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { blockedReason } = req.body;

        const user = await User.findByPk(userId as string);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Update user status
        await user.update({
            blocked: true,
            blockedReason: blockedReason || 'Blocked by administrator',
        });

        // Log the action
        await AuditLog.create({
            userId: (req.user?.userId as string) || 'system',
            action: 'user_blocked',
            actor: req.user?.username || 'system',
            actorRole: req.user?.role || 'admin',
            resource: 'user',
            resourceId: typeof userId === 'string' ? userId : userId[0],
            status: 'success',
            details: { blockedReason },
            newObject: { blocked: true, blockedReason },
        });

        return res.status(200).json({
            message: 'User blocked successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                blocked: user.blocked,
                blockedReason: user.blockedReason,
            },
        });
    } catch (error) {
        console.error('Block user error:', error);
        return res.status(500).json({
            error: 'Failed to block user',
        });
    }
});

/**
 * PATCH /admin/users/:userId/unblock
 * Unblock a user
 */
router.patch('/users/:userId/unblock', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId as string);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Update user status
        await user.update({
            blocked: false,
            blockedReason: null,
        });

        // Log the action
        await AuditLog.create({
            userId: (req.user?.userId as string) || 'system',
            action: 'user_unblocked',
            actor: req.user?.username || 'system',
            actorRole: req.user?.role || 'admin',
            resource: 'user',
            resourceId: typeof userId === 'string' ? userId : userId[0],
            status: 'success',
            newObject: { blocked: false },
        });

        return res.status(200).json({
            message: 'User unblocked successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                blocked: user.blocked,
            },
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        return res.status(500).json({
            error: 'Failed to unblock user',
        });
    }
});

/**
 * GET /admin/reserved-usernames
 * List all reserved usernames
 */
router.get('/reserved-usernames', async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, search } = req.query;

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
        const offset = (pageNum - 1) * limitNum;

        const where: any = {};

        if (search) {
            where.username = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await ReservedUsername.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset,
        });

        return res.status(200).json({
            message: 'Reserved usernames retrieved',
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                pages: Math.ceil(count / limitNum),
            },
        });
    } catch (error) {
        console.error('Get reserved usernames error:', error);
        return res.status(500).json({
            error: 'Failed to retrieve reserved usernames',
        });
    }
});

/**
 * POST /admin/reserved-usernames
 * Add a new reserved username
 */
router.post('/reserved-usernames', async (req: Request, res: Response) => {
    try {
        const { username, reason } = req.body;

        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            return res.status(400).json({
                error: 'Username is required and must be a non-empty string',
            });
        }

        const normalizedUsername = username.toLowerCase().trim();

        // Check if already reserved
        const existing = await ReservedUsername.findOne({
            where: { username: normalizedUsername },
        });

        if (existing) {
            return res.status(409).json({
                error: 'Username is already reserved',
            });
        }

        // Create new reserved username
        const reserved = await ReservedUsername.create({
            username: normalizedUsername,
            reason: reason || null,
        });

        // Log the action
        await AuditLog.create({
            userId: (req.user?.userId as string) || 'system',
            action: 'reserved_username_created',
            actor: req.user?.username || 'system',
            actorRole: req.user?.role || 'admin',
            resource: 'reserved_username',
            resourceId: reserved.id,
            status: 'success',
            details: { username: normalizedUsername },
            newObject: { username: normalizedUsername, reason },
        });

        return res.status(201).json({
            message: 'Reserved username added successfully',
            data: reserved,
        });
    } catch (error) {
        console.error('Add reserved username error:', error);
        return res.status(500).json({
            error: 'Failed to add reserved username',
        });
    }
});

/**
 * DELETE /admin/reserved-usernames/:username
 * Remove a reserved username
 */
router.delete('/reserved-usernames/:username', async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const usernameStr = typeof username === 'string' ? username : username[0];
        const normalizedUsername = usernameStr.toLowerCase().trim();

        const reserved = await ReservedUsername.findOne({
            where: { username: normalizedUsername },
        });

        if (!reserved) {
            return res.status(404).json({
                error: 'Reserved username not found',
            });
        }

        // Log the action before deletion
        await AuditLog.create({
            userId: (req.user?.userId as string) || 'system',
            action: 'reserved_username_deleted',
            actor: req.user?.username || 'system',
            actorRole: req.user?.role || 'admin',
            resource: 'reserved_username',
            resourceId: reserved.id,
            status: 'success',
            originalObject: { username: reserved.username, reason: reserved.reason },
        });

        // Delete the reserved username
        await reserved.destroy();

        return res.status(200).json({
            message: 'Reserved username removed successfully',
        });
    } catch (error) {
        console.error('Delete reserved username error:', error);
        return res.status(500).json({
            error: 'Failed to delete reserved username',
        });
    }
});

/**
 * PUT /admin/reserved-usernames/:username
 * Update a reserved username
 */
router.put('/reserved-usernames/:username', async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const { reason } = req.body;
        const usernameStr = typeof username === 'string' ? username : username[0];
        const normalizedUsername = usernameStr.toLowerCase().trim();

        const reserved = await ReservedUsername.findOne({
            where: { username: normalizedUsername },
        });

        if (!reserved) {
            return res.status(404).json({
                error: 'Reserved username not found',
            });
        }

        const originalData = { username: reserved.username, reason: reserved.reason };

        // Update the reserved username
        await reserved.update({ reason: reason || null });

        // Log the action
        await AuditLog.create({
            userId: (req.user?.userId as string) || 'system',
            action: 'reserved_username_updated',
            actor: req.user?.username || 'system',
            actorRole: req.user?.role || 'admin',
            resource: 'reserved_username',
            resourceId: reserved.id,
            status: 'success',
            originalObject: originalData,
            newObject: { username: reserved.username, reason },
        });

        return res.status(200).json({
            message: 'Reserved username updated successfully',
            data: reserved,
        });
    } catch (error) {
        console.error('Update reserved username error:', error);
        return res.status(500).json({
            error: 'Failed to update reserved username',
        });
    }
});

export default router;