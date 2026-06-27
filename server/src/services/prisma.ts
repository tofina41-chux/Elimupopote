// Singleton Prisma client. Importing this file anywhere always returns the
// same client instance, which is important in dev (ts-node-dev / nodemon
// hot-reload) to avoid exhausting Postgres connections.
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
