import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getReputation, getReputationHistory } from "./reputation.service";

export const reputationRouter: Router = Router();

// GET /api/reputation/me
reputationRouter.get(
  "/api/reputation/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getReputation(req.user!.id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reputation/me/history
reputationRouter.get(
  "/api/reputation/me/history",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getReputationHistory(req.user!.id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);
