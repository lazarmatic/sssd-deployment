import { OpenAPIV3 } from "openapi-types";

export const openApiSpec: OpenAPIV3.Document = {
    openapi: "3.0.3",
    info: {
        title: "SSD2026 API",
        version: "1.0.0",
        description: "Authentication API for the SSD2026 project.",
    },
    servers: [
        { url: "http://localhost:3000/api", description: "Local development server" },
    ],
    tags: [
        { name: "Health", description: "Server liveness check" },
        { name: "Auth", description: "User registration and login" },
    ],
    paths: {
        "/health": {
            get: {
                tags: ["Health"],
                summary: "Health check",
                operationId: "healthCheck",
                responses: {
                    "200": {
                        description: "Server is healthy",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", example: "ok" },
                                    },
                                    required: ["status"],
                                },
                                example: { status: "ok" },
                            },
                        },
                    },
                },
            },
        },

        "/register": {
            post: {
                tags: ["Auth"],
                summary: "Register a new user",
                operationId: "registerUser",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    fullName: {
                                        type: "string",
                                        minLength: 3,
                                        maxLength: 100,
                                        description: "User's full name. Must not contain HTML/script tags.",
                                        example: "Lazar Matic",
                                    },
                                    username: {
                                        type: "string",
                                        minLength: 4,
                                        pattern: "^[a-zA-Z0-9]+$",
                                        description:
                                            "Alphanumeric only, min 4 chars, must not be reserved (admin/root/system/support).",
                                        example: "lazar123",
                                    },
                                    email: {
                                        type: "string",
                                        format: "email",
                                        description: "Valid email format. Must be unique.",
                                        example: "lazar@gmail.com",
                                    },
                                    password: {
                                        type: "string",
                                        minLength: 8,
                                        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$",
                                        description:
                                            "Min 8 chars, must include uppercase, lowercase, number, special char.",
                                        example: "StrongPass1!",
                                    },
                                    phone: {
                                        type: "string",
                                        pattern: "^[0-9]{6,15}$",
                                        description: "Valid mobile phone number, unique.",
                                        example: "123456789",
                                    },
                                },
                                required: ["fullName", "username", "email", "password", "phone"],
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "User validated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        data: { type: "object" },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Validation error",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        error: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        "/login": {
            post: {
                tags: ["Auth"],
                summary: "Login user",
                operationId: "loginUser",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    username: {
                                        type: "string",
                                        description: "Username of the account. Can use email instead.",
                                        example: "lazar123",
                                    },
                                    email: {
                                        type: "string",
                                        format: "email",
                                        description: "Email of the account. Can use username instead.",
                                        example: "lazar@gmail.com",
                                    },
                                    password: {
                                        type: "string",
                                        minLength: 8,
                                        description: "Password of the account",
                                        example: "StrongPass1!",
                                    },
                                },
                                required: ["password"], // At least password required; either username/email must be sent
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Login input valid",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                    },
                                },
                                example: { message: "Login input valid (no auth yet)" },
                            },
                        },
                    },
                    "400": {
                        description: "Validation error",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        error: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};