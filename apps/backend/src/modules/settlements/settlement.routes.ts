import { Router, Request, Response, NextFunction } from "express";
import { adminMiddleware } from "../../middleware/auth";
import { settleCycleSchema } from "./settlement.schema";
import { settleCycle } from "./settlement.service";

export const settlementRouter: Router = Router();

// POST /api/cycles/:cycleId/settle
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
