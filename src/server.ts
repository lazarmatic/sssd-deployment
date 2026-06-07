import app, { initializeDatabase } from "./app";
import { config } from "./config";

/**
 * Start the server and initialize database
 */
async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();

        // Start server
        app.listen(config.port, () => {
            console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Start the server
startServer();

