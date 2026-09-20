import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { nonceRequestSchema, verifySignatureSchema } from "./auth.schema";
import { createNonce, verifySignature, getSession } from "./auth.service";

export const authRouter: Router = Router();

// POST /api/auth/nonce
authRouter.post(
  "/api/auth/nonce",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = nonceRequestSchema.parse(req.body);
      const result = createNonce(walletAddress);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/verify
authRouter.post(
  "/api/auth/verify",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = verifySignatureSchema.parse(req.body);
      const result = await verifySignature(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/session
authRouter.get(
  "/api/auth/session",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getSession(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
authRouter.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out successfully" });
});
