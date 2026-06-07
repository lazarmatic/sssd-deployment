import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * TrustedDevice Model
 * Stores trusted devices that can bypass 2FA for a limited period
 */

interface TrustedDeviceAttributes {
    id?: string;
    userId: string;
    deviceIdentifier: string; // hash of device fingerprint
    deviceName?: string; // user-friendly name
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
    lastUsedAt?: Date | null;
    revokedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class TrustedDevice extends Model<TrustedDeviceAttributes> implements TrustedDeviceAttributes {
    public id!: string;
    public userId!: string;
    public deviceIdentifier!: string;
    public deviceName?: string;
    public userAgent?: string;
    public ipAddress?: string;
    public expiresAt!: Date;
    public lastUsedAt?: Date | null;
    public revokedAt?: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

TrustedDevice.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        deviceIdentifier: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'SHA256 hash of device fingerprint for identification',
        },
        deviceName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'User-friendly device name (e.g., "Chrome on Windows")',
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Full user agent string',
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'IP address when device was marked as trusted',
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Device trust expires (10 days from creation)',
        },
        lastUsedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last time device bypassed 2FA',
        },
        revokedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Time when device was manually revoked',
        },
    },
    {
        sequelize,
        modelName: 'TrustedDevice',
        tableName: 'trusted_devices',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['device_identifier'] },
            { fields: ['expires_at'] },
        ],
    }
);

TrustedDevice.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

export default TrustedDevice;
