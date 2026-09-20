import { Request, Response, NextFunction } from "express";
import { adminMiddleware } from "../../middleware/auth";

/**
 * Admin Guard Middleware
 * Enforces authentication and checks that the user has the ADMIN role.
 * Rejects non-admin requests with 403 Forbidden, and missing/invalid tokens with 401 Unauthorized.
 */
export const adminGuard = adminMiddleware;
export const requireAdmin = adminMiddleware;
