import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * Session Model
 * Stores JWT sessions with refresh tokens for session management
 */

interface SessionAttributes {
    id?: string;
    userId: string;
    trustedDeviceId?: string | null;
    refreshToken: string;
    accessToken: string;
    refreshTokenExpiresAt: Date;
    accessTokenExpiresAt: Date;
    isValid?: boolean;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: Date;
    updatedAt?: Date;
    revokedAt?: Date | null;
}

export class Session extends Model<SessionAttributes> implements SessionAttributes {
    public id!: string;
    public userId!: string;
    public trustedDeviceId?: string | null;
    public refreshToken!: string;
    public accessToken!: string;
    public refreshTokenExpiresAt!: Date;
    public accessTokenExpiresAt!: Date;
    public isValid!: boolean;
    public ipAddress?: string;
    public userAgent?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public revokedAt?: Date;
}

Session.init(
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
        trustedDeviceId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'trusted_devices',
                key: 'id',
            },
            comment: 'Reference to trusted device if session is from a trusted device',
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'JWT refresh token',
        },
        accessToken: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'JWT access token',
        },
        refreshTokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Expiration time for refresh token',
        },
        accessTokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Expiration time for access token',
        },
        isValid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether the session is still valid',
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'IP address of the session',
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent of the session',
        },
        revokedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Time when session was revoked',
        },
    },
    {
        sequelize,
        modelName: 'Session',
        tableName: 'sessions',
        timestamps: true,
        underscored: true,
    }
);

Session.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

export default Session;
