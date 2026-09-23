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

export const ADMIN_WALLETS: string[] = [
  "0x0fcfeeaaa5e028c4431e216dacf4bc97b8654897",
  ...(process.env.ADMIN_WALLET_ADDRESSES || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  authMiddleware(req, res, () => {
    const userWallet = (req.user?.walletAddress || "").toLowerCase();
    const isWalletAdmin = ADMIN_WALLETS.includes(userWallet);

    if (req.user?.role !== "ADMIN" && !isWalletAdmin) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Forbidden: Admin role required",
        },
      });
      return;
    }

    if (isWalletAdmin && req.user) {
      req.user.role = "ADMIN";
    }

    next();
  });
}
