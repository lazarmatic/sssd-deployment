import sequelize from "../src/config/database";
import User from "../src/models/User";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

/**
 * Seed database with test users
 * Run this after database sync to populate test data
 */
export async function seedDatabase(): Promise<void> {
    try {
        console.log("🌱 Seeding database with test data...");

        // Create test user if not exists
        const existingUser = await User.findOne({ where: { username: "testuser" } });
        if (!existingUser) {
            await User.create({
                id: randomUUID(),
                username: "testuser",
                email: "testuser@example.com",
                passwordHash: await bcrypt.hash("TestPassword123!", 10),
                phone: "+38766756392",
                emailVerified: true,
                twoFactorRequired: false,
                totpEnabled: false,
                blocked: false,
            });
            console.log("✓ Test user created successfully");
            console.log("  Username: testuser");
            console.log("  Password: TestPassword123!");
            console.log("  Email: testuser@example.com");
        } else {
            console.log("✓ Test user already exists, skipping");
        }

        // Create admin user if not exists
        const existingAdmin = await User.findOne({ where: { username: "admin" } });
        if (!existingAdmin) {
            await User.create({
                id: randomUUID(),
                username: "admin",
                email: "admin@example.com",
                passwordHash: await bcrypt.hash("AdminPassword123!", 10),
                phone: "+1234567890",
                emailVerified: true,
                twoFactorRequired: false,
                totpEnabled: false,
                blocked: false,
            });
            console.log("✓ Admin user created successfully");
            console.log("  Username: admin");
            console.log("  Password: AdminPassword123!");
            console.log("  Email: admin@example.com");
        } else {
            console.log("✓ Admin user already exists, skipping");
        }
        // Seed hardcoded reserved usernames into database
        const ReservedUsername = (await import('../src/models/ReservedUsername')).default;
        const hardcodedReserved = [
            { username: 'admin', reason: 'System reserved username' },
            { username: 'root', reason: 'System reserved username' },
            { username: 'system', reason: 'System reserved username' },
            { username: 'administrator', reason: 'System reserved username' },
            { username: 'superuser', reason: 'System reserved username' },
            { username: 'sudo', reason: 'System reserved username' },
            { username: 'sysadmin', reason: 'System reserved username' },
            { username: 'noreply', reason: 'System reserved username' },
            { username: 'support', reason: 'System reserved username' },
            { username: 'help', reason: 'System reserved username' },
            { username: 'contact', reason: 'System reserved username' },
            { username: 'security', reason: 'System reserved username' },
            { username: 'postmaster', reason: 'System reserved username' },
            { username: 'webmaster', reason: 'System reserved username' },
            { username: 'api', reason: 'System reserved username' },
            { username: 'bot', reason: 'System reserved username' },
            { username: 'service', reason: 'System reserved username' },
            { username: 'test', reason: 'System reserved username' },
            { username: 'demo', reason: 'System reserved username' },
            { username: 'staging', reason: 'System reserved username' },
            { username: 'localhost', reason: 'System reserved username' },
            { username: 'moderator', reason: 'System reserved username' },
            { username: 'staff', reason: 'System reserved username' },
            { username: 'official', reason: 'System reserved username' },
            { username: 'verified', reason: 'System reserved username' },
            { username: 'developer', reason: 'System reserved username' },
            { username: 'login', reason: 'System reserved username' },
            { username: 'logout', reason: 'System reserved username' },
            { username: 'register', reason: 'System reserved username' },
            { username: 'signup', reason: 'System reserved username' },
        ];

        for (const entry of hardcodedReserved) {
            const existing = await ReservedUsername.findOne({ where: { username: entry.username } });
            if (!existing) {
                await ReservedUsername.create(entry);
            }
        }
        console.log('✓ Reserved usernames seeded successfully');

        console.log("✓ Database seeding completed");
    } catch (error) {
        console.error("✗ Error seeding database:", error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}