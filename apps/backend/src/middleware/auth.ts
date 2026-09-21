import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../utils/jwt";

export interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized: Missing or invalid token",
      },
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: JwtPayload = verifyJwt(token);
    req.user = {
      id: decoded.sub,
      walletAddress: decoded.walletAddress,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized: Invalid or expired token",
      },
    });
  }
}

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "ADMIN") {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Forbidden: Admin role required",
        },
      });
      return;
    }
    next();
  });
}
