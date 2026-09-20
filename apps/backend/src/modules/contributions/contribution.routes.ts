import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getUserContributions } from "./contribution.service";

export const contributionRouter: Router = Router();

// GET /api/contributions/me
contributionRouter.get(
  "/api/contributions/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getUserContributions(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
