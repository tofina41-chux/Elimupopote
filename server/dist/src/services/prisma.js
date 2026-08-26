"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.databaseAvailable = void 0;
const client_1 = require("@prisma/client");
const extension_accelerate_1 = require("@prisma/extension-accelerate");
exports.databaseAvailable = Boolean(process.env.DATABASE_URL);
exports.prisma = global.__prisma ??
    new client_1.PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
    }).$extends((0, extension_accelerate_1.withAccelerate)());
if (process.env.NODE_ENV !== "production") {
    global.__prisma = exports.prisma;
}
