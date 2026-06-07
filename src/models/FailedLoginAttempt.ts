import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * FailedLoginAttempt Model
 * Tracks failed login attempts for CAPTCHA triggering and rate limiting
 */

interface FailedLoginAttemptAttributes {
    id?: string;
    username?: string;
    email?: string;
    ipAddress: string;
    reason?: string; // invalid_credentials, account_locked, etc.
    attemptAt?: Date;
}

export class FailedLoginAttempt extends Model<FailedLoginAttemptAttributes> implements FailedLoginAttemptAttributes {
    public id!: string;
    public username?: string;
    public email?: string;
    public ipAddress!: string;
    public reason?: string;
    public readonly attemptAt!: Date;
}

FailedLoginAttempt.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Username attempted (may not exist)',
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Email attempted (may not exist)',
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'IP address of the failed attempt',
        },
        reason: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Reason for failure: invalid_credentials, account_locked, unverified_email, etc.',
        },
        attemptAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Timestamp of failed attempt',
        },
    },
    {
        sequelize,
        modelName: 'FailedLoginAttempt',
        tableName: 'failed_login_attempts',
        timestamps: false,
        underscored: true,
        createdAt: 'attempt_at',
        updatedAt: false,
        indexes: [
            { fields: ['ip_address'] },
            { fields: ['username'] },
            { fields: ['email'] },
            { fields: ['attempt_at'] },
            { fields: ['ip_address', 'attempt_at'] },
        ],
    }
);

export default FailedLoginAttempt;
