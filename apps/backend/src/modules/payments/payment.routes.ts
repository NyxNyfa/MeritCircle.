import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { confirmPaymentSchema } from "./payment.schema";
import { createPaymentIntent, confirmPayment } from "./payment.service";

export const paymentRouter: Router = Router();

// POST /api/cycles/:cycleId/payment-intent
paymentRouter.post(
  "/api/cycles/:cycleId/payment-intent",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await createPaymentIntent(
        req.user!.id,
        req.params.cycleId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/payments/payment-intent (Frontend compatibility)
paymentRouter.post(
  "/api/payments/payment-intent",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const target = req.body?.contributionId
        ? req.body.contributionId
        : req.body?.cycleId || req.body;
      const result = await createPaymentIntent(req.user!.id, target);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/contributions/confirm & POST /api/payments/confirm
const handleConfirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = confirmPaymentSchema.parse(req.body);
    const result = await confirmPayment(req.user!.id, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

paymentRouter.post("/api/contributions/confirm", authMiddleware, handleConfirmPayment);
paymentRouter.post("/api/payments/confirm", authMiddleware, handleConfirmPayment);

