import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * ReservedUsername Model
 * Manages reserved/blocked usernames that cannot be registered
 */

interface ReservedUsernameAttributes {
    id?: string;
    username: string;
    reason?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class ReservedUsername extends Model<ReservedUsernameAttributes> implements ReservedUsernameAttributes {
    public id!: string;
    public username!: string;
    public reason?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

/**
 * Initialize ReservedUsername model schema
 */
ReservedUsername.init(
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
                len: [1, 50],
                isAlphanumeric: true,
            },
            comment: 'Reserved username that cannot be registered',
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason why this username is reserved',
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: 'ReservedUsername',
        tableName: 'reserved_usernames',
        timestamps: true,
    }
);

export default ReservedUsername;
