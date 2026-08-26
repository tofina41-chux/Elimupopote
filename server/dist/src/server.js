"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const prisma_1 = require("./services/prisma");
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
async function startServer() {
    try {
        await prisma_1.prisma.$connect();
        console.log("✅ Connected to database.");
    }
    catch (error) {
        console.error("Failed to connect:", error?.message || error);
        process.exit(1);
    }
    const app = (0, app_1.createApp)();
    app.listen(PORT, () => {
        console.log(`🚀 ElimuPopote API listening on http://localhost:${PORT}`);
    });
}
startServer();
