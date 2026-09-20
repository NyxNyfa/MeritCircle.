import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getCycleDetail } from "./cycle.service";

export const cycleRouter: Router = Router();

// GET /api/cycles/:cycleId
cycleRouter.get(
  "/api/cycles/:cycleId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getCycleDetail(req.user!.id, req.params.cycleId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
