import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getUserContributions } from "./contribution.service";

export const contributionRouter: Router = Router();

// GET /api/contributions, /api/contributions/me, /api/contributions/my
const getMyContributionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getUserContributions(req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

contributionRouter.get("/api/contributions", authMiddleware, getMyContributionsHandler);
contributionRouter.get("/api/contributions/me", authMiddleware, getMyContributionsHandler);
contributionRouter.get("/api/contributions/my", authMiddleware, getMyContributionsHandler);
