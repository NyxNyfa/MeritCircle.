import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getPools, getPoolById, joinPool } from "./pool.service";

export const poolRouter: Router = Router();

// GET /api/pools
poolRouter.get(
  "/api/pools",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getPools();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/pools/:poolId
poolRouter.get(
  "/api/pools/:poolId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getPoolById(req.params.poolId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/pools/:poolId/join
poolRouter.post(
  "/api/pools/:poolId/join",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await joinPool(req.user!.id, req.params.poolId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
