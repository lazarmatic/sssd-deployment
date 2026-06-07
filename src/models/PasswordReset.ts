import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * PasswordReset Model
 * Tracks password reset requests with expiration and attempt counting
 */

interface PasswordResetAttributes {
    id?: string;
    userId: string;
    resetToken: string;
    tokenExpiresAt: Date;
    attemptCount?: number;
    maxAttempts?: number;
    windowStartedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    usedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class PasswordReset extends Model<PasswordResetAttributes> implements PasswordResetAttributes {
    public id!: string;
    public userId!: string;
    public resetToken!: string;
    public tokenExpiresAt!: Date;
    public attemptCount!: number;
    public maxAttempts!: number;
    public windowStartedAt!: Date;
    public ipAddress?: string;
    public userAgent?: string;
    public usedAt?: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

PasswordReset.init(
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
        resetToken: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            comment: 'Unique reset token sent to email',
        },
        tokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Token expires in 5 minutes',
        },
        attemptCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of attempts to use this token (max 2)',
        },
        maxAttempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 2,
            comment: 'Maximum allowed attempts before needing new request',
        },
        windowStartedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Start of 10-minute window for attempt limiting',
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'IP address of password reset request',
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent of password reset request',
        },
        usedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the reset token was successfully used',
        },
    },
    {
        sequelize,
        modelName: 'PasswordReset',
        tableName: 'password_resets',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['reset_token'] },
            { fields: ['token_expires_at'] },
        ],
    }
);

PasswordReset.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

export default PasswordReset;
