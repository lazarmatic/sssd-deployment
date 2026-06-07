import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * AuditLog Model
 * Centralized logging for all security-relevant events
 */

interface AuditLogAttributes {
    id?: string;
    userId?: string | null;
    action: string;
    actor: string; // who performed the action
    actorRole?: string; // admin, user, system
    resource: string; // what was affected (login, registration, etc.)
    resourceId?: string | null;
    ipAddress?: string;
    userAgent?: string;
    details?: object | null; // additional details as JSON
    originalObject?: object | null; // previous state (for updates)
    newObject?: object | null; // new state (for creates/updates)
    status: string; // success, failure, pending
    errorMessage?: string | null;
    createdAt?: Date;
}

export class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
    public id!: string;
    public userId?: string | null;
    public action!: string;
    public actor!: string;
    public actorRole?: string;
    public resource!: string;
    public resourceId?: string | null;
    public ipAddress?: string;
    public userAgent?: string;
    public details?: object | null;
    public originalObject?: object | null;
    public newObject?: object | null;
    public status!: string;
    public errorMessage?: string | null;
    public readonly createdAt!: Date;
}

AuditLog.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: 'User ID of the actor (null for system/anonymous actions)',
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Action performed: login, logout, register, password_change, etc.',
        },
        actor: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Username or identifier of who performed the action',
        },
        actorRole: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'user',
            comment: 'Role of the actor (admin, user, system, etc.)',
        },
        resource: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Resource affected: user, session, password_reset, etc.',
        },
        resourceId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'ID of the resource affected',
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'IP address from which action was performed',
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent string',
        },
        details: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional context as JSON',
        },
        originalObject: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Previous state of object (for updates)',
        },
        newObject: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'New state of object (for creates/updates)',
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'success',
            comment: 'success, failure, pending',
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Error message if action failed',
        },
    },
    {
        sequelize,
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['action'] },
            { fields: ['resource'] },
            { fields: ['created_at'] },
            { fields: ['ip_address'] },
        ],
    }
);

AuditLog.belongsTo(User, { foreignKey: 'userId', onDelete: 'SET NULL' });

export default AuditLog;
