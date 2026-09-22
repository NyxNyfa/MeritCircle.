import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function getDefaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    case 502:
      return "BAD_GATEWAY";
    default:
      return `HTTP_${status}`;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation error",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Handle payload too large errors (HTTP 413 from body-parser)
  if ((err as any)?.type === "entity.too.large" || (err as any)?.status === 413) {
    res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request payload exceeds allowed limit",
      },
    });
    return;
  }

  // Handle AppError and duck-typed HTTP status errors
  const isAppError =
    err instanceof AppError ||
    (typeof (err as any)?.statusCode === "number" && typeof (err as any)?.message === "string") ||
    (typeof (err as any)?.status === "number" && typeof (err as any)?.message === "string");

  if (isAppError) {
    const statusCode = (err as any).statusCode || (err as any).status || 400;
    const code = (err as any).code || getDefaultErrorCode(statusCode);
    res.status(statusCode).json({
      error: {
        code,
        message: (err as any).message,
      },
    });
    return;
  }

  // Handle Prisma database errors
  const errName = (err as any)?.name;
  if (errName === "PrismaClientKnownRequestError") {
    const prismaCode = (err as any)?.code;
    if (prismaCode === "P2002") {
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A record with this unique field already exists",
        },
      });
      return;
    }
    if (prismaCode === "P2025") {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Requested database record was not found",
        },
      });
      return;
    }
    if (prismaCode === "P2003") {
      res.status(400).json({
        error: {
          code: "FOREIGN_KEY_VIOLATION",
          message: "Referenced entity does not exist",
        },
      });
      return;
    }
    if (prismaCode === "P2021") {
      logger.error("[Prisma] Table missing in database:", (err as any)?.message);
      res.status(500).json({
        error: {
          code: "DATABASE_SCHEMA_ERROR",
          message:
            process.env.NODE_ENV === "production"
              ? "Database schema error: table does not exist. Please run database migrations."
              : (err as Error).message,
        },
      });
      return;
    }
  }

  if (errName === "PrismaClientInitializationError") {
    logger.error("[Prisma] Database connection initialization failed:", (err as any)?.message);
    res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database connection could not be established. Please verify database availability.",
      },
    });
    return;
  }

  if (err instanceof Error) {
    logger.error("Unhandled application error:", err.message, err.stack);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}
