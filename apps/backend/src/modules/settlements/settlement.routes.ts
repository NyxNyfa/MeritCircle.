import { Router, Request, Response, NextFunction } from "express";
import { adminMiddleware, authMiddleware } from "../../middleware/auth";
import { settleCycleSchema, timeBasedSettleSchema } from "./settlement.schema";
import {
  settleCycle,
  triggerTimeBasedSettlement,
  processExpiredCycles,
} from "./settlement.service";

export const settlementRouter: Router = Router();

// POST /api/cycles/:cycleId/settle (Method 2: Admin Manual Settlement)
settlementRouter.post(
  "/api/cycles/:cycleId/settle",
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = settleCycleSchema.parse(req.body || {});
      const result = await settleCycle(
        req.user!.id,
        req.params.cycleId,
        parsedBody
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/cycles/:cycleId/time-based-settle (Method 1: Time-based / Epoch Expiration Settlement)
settlementRouter.post(
  "/api/cycles/:cycleId/time-based-settle",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = timeBasedSettleSchema.parse(req.body || {});
      const result = await triggerTimeBasedSettlement(req.params.cycleId, {
        forceEpochExpiry: parsed.forceEpochExpiry,
        recipientUserId: parsed.recipientUserId,
        callerUserId: (req as any).user?.id,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settlements/process-expired (Batch worker/cron trigger)
settlementRouter.post(
  "/api/settlements/process-expired",
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await processExpiredCycles();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
