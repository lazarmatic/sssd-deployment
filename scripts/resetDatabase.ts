/**
 * Database Reset Script
 * Drops and recreates all tables with correct schema
 * Run with: ts-node scripts/resetDatabase.ts
 */

import sequelize, { resetDatabase } from '../src/config/database';

async function run() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║              DATABASE RESET SCRIPT                          ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('⚠️  This will DROP all existing tables and recreate them fresh.');
        console.log('✓ This removes duplicate/conflicting constraints\n');

        await resetDatabase();

        console.log('\n✓ Database reset complete!');
        console.log('✓ All tables recreated with clean schema\n');

        process.exit(0);
    } catch (error) {
        console.error('✗ Failed to reset database:', error);
        process.exit(1);
    }
}

run();
