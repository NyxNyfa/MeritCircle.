import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  getUserGroups,
  getGroupDetail,
  getGroupCycles,
} from "./group.service";

export const groupRouter: Router = Router();

// GET /api/groups, /api/groups/me, /api/groups/my
const getMyGroupsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getUserGroups(req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

groupRouter.get("/api/groups", authMiddleware, getMyGroupsHandler);
groupRouter.get("/api/groups/me", authMiddleware, getMyGroupsHandler);
groupRouter.get("/api/groups/my", authMiddleware, getMyGroupsHandler);

// GET /api/groups/:groupId
groupRouter.get(
  "/api/groups/:groupId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getGroupDetail(req.user!.id, req.params.groupId);
      res.json({ group: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/groups/:groupId/cycles
groupRouter.get(
  "/api/groups/:groupId/cycles",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getGroupCycles(req.user!.id, req.params.groupId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
