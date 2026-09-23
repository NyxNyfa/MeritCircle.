import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client instance for Merit Circle backend.
 * Prevents multiple instances during hot-reload in development.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.includes("connection_limit")
    ? process.env.DATABASE_URL
    : `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=5`
  : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
