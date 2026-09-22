import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getReputation, getReputationHistory } from "./reputation.service";

export const reputationRouter: Router = Router();

// GET /api/reputation/me, /api/reputation
const getReputationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getReputation(req.user!.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

reputationRouter.get("/api/reputation/me", authMiddleware, getReputationHandler);
reputationRouter.get("/api/reputation", authMiddleware, getReputationHandler);

// GET /api/reputation/me/history, /api/reputation/history
const getReputationHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getReputationHistory(req.user!.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

reputationRouter.get(
  "/api/reputation/me/history",
  authMiddleware,
  getReputationHistoryHandler
);
reputationRouter.get(
  "/api/reputation/history",
  authMiddleware,
  getReputationHistoryHandler
);
