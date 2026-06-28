"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// Singleton Prisma client. Importing this file anywhere always returns the
// same client instance, which is important in dev (ts-node-dev / nodemon
// hot-reload) to avoid exhausting Postgres connections.
const client_1 = require("@prisma/client");
exports.prisma = global.__prisma ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== "production") {
    global.__prisma = exports.prisma;
}
