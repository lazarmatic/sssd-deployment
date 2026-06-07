import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database Configuration
 * Connects to MySQL database using environment variables
 */

const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'sssd_23004165',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
        timestamps: true,
        underscored: true,
    },
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully');
        return true;
    } catch (error) {
        console.error('✗ Unable to connect to the database:', error);
        return false;
    }
}

/**
 * Sync database schema
 */
export async function syncDatabase(force = false): Promise<void> {
    try {
        // In development, use force: true to recreate tables cleanly (prevents duplicate constraints)
        // In production, use alter: true to safely modify existing schema
        const isDevelopment = process.env.NODE_ENV === 'development';
        const syncOption = isDevelopment
            ? { force: true }  // Clean recreation in development
            : { alter: !force };  // Safe alterations in production

        await sequelize.sync(syncOption);
        console.log('✓ Database synchronized successfully');
    } catch (error) {
        console.error('✗ Error synchronizing database:', error);
        throw error;
    }
}

/**
 * Force reset database (drops and recreates all tables)
 * Use only for development/testing
 */
export async function resetDatabase(): Promise<void> {
    try {
        console.log('⚠️  Resetting database - dropping all tables...');
        await sequelize.sync({ force: true });
        console.log('✓ Database reset complete');
    } catch (error) {
        console.error('✗ Error resetting database:', error);
        throw error;
    }
}

export default sequelize;
