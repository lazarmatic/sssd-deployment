import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * PasswordResetAttempt Model
 * Tracks password reset attempts per account/IP for CAPTCHA and rate limiting
 */

interface PasswordResetAttemptAttributes {
    id?: string;
    email: string;
    ipAddress: string;
    success?: boolean;
    reason?: string; // invalid_token, expired_token, max_attempts_exceeded, etc.
    attemptAt?: Date;
}

export class PasswordResetAttempt extends Model<PasswordResetAttemptAttributes> implements PasswordResetAttemptAttributes {
    public id!: string;
    public email!: string;
    public ipAddress!: string;
    public success!: boolean;
    public reason?: string;
    public readonly attemptAt!: Date;
}

PasswordResetAttempt.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Email address for password reset attempt',
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'IP address of the attempt',
        },
        success: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether reset attempt was successful',
        },
        reason: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Reason for failure or success',
        },
        attemptAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Timestamp of attempt',
        },
    },
    {
        sequelize,
        modelName: 'PasswordResetAttempt',
        tableName: 'password_reset_attempts',
        timestamps: false,
        underscored: true,
        createdAt: 'attempt_at',
        updatedAt: false,
        indexes: [
            { fields: ['email'] },
            { fields: ['ip_address'] },
            { fields: ['attempt_at'] },
            { fields: ['email', 'attempt_at'] },
            { fields: ['ip_address', 'attempt_at'] },
        ],
    }
);

export default PasswordResetAttempt;
