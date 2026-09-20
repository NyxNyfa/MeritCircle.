import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getGroupRewardLedger } from "./reward-ledger.service";

export const rewardLedgerRouter: Router = Router();

// GET /api/groups/:groupId/reward-ledger
rewardLedgerRouter.get(
  "/api/groups/:groupId/reward-ledger",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getGroupRewardLedger(
        req.user!.id,
        req.params.groupId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
