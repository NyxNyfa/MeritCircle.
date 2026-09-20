import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware, adminMiddleware } from "../../middleware/auth";
import {
  getCycleAuction,
  openAuction,
  closeAuction,
} from "./auction.service";

export const auctionRouter: Router = Router();

// GET /api/cycles/:cycleId/auction
auctionRouter.get(
  "/api/cycles/:cycleId/auction",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getCycleAuction(req.user!.id, req.params.cycleId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/cycles/:cycleId/auction/open
auctionRouter.post(
  "/api/cycles/:cycleId/auction/open",
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await openAuction(req.user!.id, req.params.cycleId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/cycles/:cycleId/auction/close
auctionRouter.post(
  "/api/cycles/:cycleId/auction/close",
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await closeAuction(req.user!.id, req.params.cycleId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
