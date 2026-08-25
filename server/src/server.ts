import "dotenv/config";
import { createApp } from "./app";
import { prisma } from "./services/prisma";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to database.");
  } catch (error: any) {
    console.error("Failed to connect:", error?.message || error);
    process.exit(1);
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`🚀 ElimuPopote API listening on http://localhost:${PORT}`);
  });
}

startServer();