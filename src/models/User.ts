import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * User Model
 * Represents a user in the system with authentication credentials
 * Passwords are stored as hashes, never plaintext
 */

interface UserAttributes {
    id?: string;
    username: string;
    email: string;
    passwordHash: string;
    phone: string;
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationTokenExpire?: Date | null;
    twoFactorRequired?: boolean;
    totpSecret?: string;
    totpEnabled?: boolean;
    blocked?: boolean;
    blockedReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
    public id!: string;
    public username!: string;
    public email!: string;
    public passwordHash!: string;
    public phone!: string;
    public emailVerified!: boolean;
    public emailVerificationToken?: string;
    public emailVerificationTokenExpire?: Date;
    public twoFactorRequired!: boolean;
    public totpSecret?: string;
    public totpEnabled!: boolean;
    public blocked!: boolean;
    public blockedReason?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

/**
 * Initialize User model schema
 */
User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [4, 50],
                isAlphanumeric: true,
            },
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'BCrypt hashed password (never store plaintext)',
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            validate: {
                len: [6, 20],
            },
        },
        emailVerified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether the email address has been verified',
        },
        emailVerificationToken: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Token for email verification (expires in 15 minutes)',
        },
        emailVerificationTokenExpire: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Expiration time for email verification token',
        },
        twoFactorRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether user must setup 2FA on first login',
        },
        totpSecret: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'TOTP secret key (Base32 encoded) for 2FA',
        },
        totpEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether TOTP 2FA is enabled for this user',
        },
        blocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether the user account has been blocked',
        },
        blockedReason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Reason why the user was blocked',
        },
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        underscored: true,
    }
);

export default User;
