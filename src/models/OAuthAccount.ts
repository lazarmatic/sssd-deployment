import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * OAuthAccount Model
 * Stores OAuth/SSO provider connections for users
 */

interface OAuthAccountAttributes {
    id?: string;
    userId: string;
    provider: string; // google, github
    providerAccountId: string; // unique ID from provider
    email: string;
    name?: string;
    picture?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export class OAuthAccount extends Model<OAuthAccountAttributes> implements OAuthAccountAttributes {
    public id!: string;
    public userId!: string;
    public provider!: string;
    public providerAccountId!: string;
    public email!: string;
    public name?: string;
    public picture?: string;
    public accessToken?: string;
    public refreshToken?: string;
    public accessTokenExpiresAt?: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

OAuthAccount.init(
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
        provider: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'OAuth provider: google, github',
        },
        providerAccountId: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Unique account ID from the provider',
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Email from OAuth provider',
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Display name from OAuth provider',
        },
        picture: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Avatar URL from OAuth provider',
        },
        accessToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Access token from OAuth provider',
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Refresh token from OAuth provider',
        },
        accessTokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the access token expires',
        },
    },
    {
        sequelize,
        modelName: 'OAuthAccount',
        tableName: 'oauth_accounts',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['provider', 'provider_account_id'], unique: true },
        ],
    }
);

OAuthAccount.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

export default OAuthAccount;
