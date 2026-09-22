import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import { logger } from "./utils/logger";
import { prisma } from "./db/client";

const PORT = Number(process.env.PORT || 4000);

export const server = app.listen(PORT, async () => {
  logger.info(`Merit Circle Backend server running on port ${PORT}`);
  try {
    await prisma.$connect();
    logger.info("[Database] Connected successfully to PostgreSQL via Prisma");
  } catch (err: any) {
    logger.error("[Database] Initial database connection check failed:", err?.message || err);
  }
});
