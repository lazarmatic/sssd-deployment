// import express from "express";
// import cors from "cors";
// import session from "express-session";
// import router from "./routes";
// import SwaggerUi from "swagger-ui-express";
// import { openApiSpec } from "./docs/openapi";
// import sequelize, { testConnection, syncDatabase, resetDatabase } from "./config/database";
// import passport from "passport";
// import { configureGoogleStrategy, configureGitHubStrategy } from "./config/passportConfig";

// const app = express();

// // Enable CORS for frontend communication (MUST be before body parsing and routes)
// app.use(cors({
//     origin: function (origin, callback) {
//         const allowedOrigins = ['http://localhost:3001', 'http://localhost:3000'];
//         if (!origin || allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     optionsSuccessStatus: 200
// }));

// // Explicitly handle all preflight OPTIONS requests
// app.options('/{*path}', cors());

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // express-session MUST come before passport.initialize() and passport.session()
// // Required for OAuth (Google/GitHub) redirect flow — JWT handles long-term auth,
// // but the OAuth dance needs a short-lived session to carry the user between
// // /auth/oauth/google and /callback routes.
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: process.env.NODE_ENV === 'production', // true = HTTPS only (prod)
//         httpOnly: true,
//         maxAge: 10 * 60 * 1000 // 10 minutes — only needed for OAuth flow
//     }
// }));

// // Initialize Passport.js
// app.use(passport.initialize());
// app.use(passport.session()); // Now safe — express-session is configured above

// // Configure OAuth strategies
// configureGoogleStrategy();
// configureGitHubStrategy();

// // Database initialization function (called from server.ts)
// export async function initializeDatabase(): Promise<boolean> {
//     try {
//         const isConnected = await testConnection();
//         if (!isConnected) {
//             console.warn("⚠️  Database connection failed, but continuing with demo mode");
//             return false;
//         }

//         // Sync database models
//         // In development: force recreates tables (prevents duplicate constraints)
//         // In production: alters existing schema safely
//         await syncDatabase();

//         // Seed test data in development
//         if (process.env.NODE_ENV === 'development') {
//             const { seedDatabase } = await import('../scripts/seedDatabase');
//             await seedDatabase();
//         }

//         console.log("✓ Database initialized successfully");
//         return true;
//     } catch (error) {
//         console.error("Database initialization error:", error);
//         console.warn("⚠️  Continuing application in demo mode without database");
//         return false;
//     }
// }

// // Connect API routes
// app.use("/api", router);

// // Development: endpoint to reset database (remove in production!)
// if (process.env.NODE_ENV === 'development') {
//     app.post("/api/dev/reset-database", async (_req, res) => {
//         try {
//             await resetDatabase();
//             res.json({ message: "Database reset successfully (all tables recreated)" });
//         } catch (error) {
//             res.status(500).json({ error: "Failed to reset database" });
//         }
//     });
// }

// // OpenAPI JSON endpoint
// app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));

// // Swagger UI endpoint
// app.use("/api/docs", SwaggerUi.serve, SwaggerUi.setup(openApiSpec));

// export default app;

import express from "express";
import cors from "cors";
import session from "express-session";
import router from "./routes";
import SwaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import sequelize, { testConnection, syncDatabase, resetDatabase } from "./config/database";
import passport from "passport";
import { configureGoogleStrategy, configureGitHubStrategy } from "./config/passportConfig";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production the frontend is served by the same Nginx origin, so we allow
// the actual domain.  In development we allow localhost variants.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 200,
    })
);

app.options("/{*path}", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session (needed for OAuth flow only) ────────────────────────────────────
app.use(
    session({
        secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 10 * 60 * 1000,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

configureGoogleStrategy();
configureGitHubStrategy();

// ─── Database init ────────────────────────────────────────────────────────────
export async function initializeDatabase(): Promise<boolean> {
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.warn("⚠️  Database connection failed, continuing in demo mode");
            return false;
        }

        await syncDatabase();

        if (process.env.NODE_ENV === "development") {
            const { seedDatabase } = await import("../scripts/seedDatabase");
            await seedDatabase();
        }

        console.log("✓ Database initialized successfully");
        return true;
    } catch (error) {
        console.error("Database initialization error:", error);
        console.warn("⚠️  Continuing in demo mode without database");
        return false;
    }
}

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// Dev-only database reset endpoint
if (process.env.NODE_ENV === "development") {
    app.post("/api/dev/reset-database", async (_req, res) => {
        try {
            await resetDatabase();
            res.json({ message: "Database reset successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to reset database" });
        }
    });
}

// ─── Swagger / OpenAPI ────────────────────────────────────────────────────────
app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));
app.use("/api/docs", SwaggerUi.serve, SwaggerUi.setup(openApiSpec));

// ─── Frontend proxy at /front ─────────────────────────────────────────────────
// In development  → Next.js dev server runs on NEXT_PORT (default 3001)
// In production   → Next.js is built and started on NEXT_PORT (default 3001)
//                   (run: npm run build && npm run start inside /frontend)
//
// Nginx only exposes port 443 to the world and proxies everything to this
// Express app on port 3000.  This proxy then forwards /front/* to Next.js.
const NEXT_PORT = process.env.NEXT_PORT || "3001";

app.use(
    "/front",
    createProxyMiddleware({
        target: `http://127.0.0.1:${NEXT_PORT}`,
        changeOrigin: true,
        // Strip the /front prefix so Next.js sees requests at /
        // e.g.  /front/login  →  /login  inside Next.js
        pathRewrite: { "^/front": "" },
        on: {
            error: (err, _req, res: any) => {
                console.error("Next.js proxy error:", err.message);
                res.status(502).json({ error: "Frontend unavailable" });
            },
        },
    })
);

export default app;