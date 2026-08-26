import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

declare global {
  var __prisma: any;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// Simple presence check used by the /api/health route. This does not verify
// live connectivity to the database — just that a connection string was
// configured — so a misbehaving DB can still report "connected" here.
export const databaseAvailable = Boolean(process.env.DATABASE_URL);