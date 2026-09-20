import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { confirmEmailSchema } from "./email.schema";
import {
  requestEmailVerification,
  confirmEmailVerification,
} from "./email.service";

export const emailRouter: Router = Router();

// POST /api/email/verify/request
emailRouter.post(
  "/api/email/verify/request",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await requestEmailVerification(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/email/verify/confirm
emailRouter.post(
  "/api/email/verify/confirm",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = confirmEmailSchema.parse(req.body);
      const result = await confirmEmailVerification(req.user!.id, code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
