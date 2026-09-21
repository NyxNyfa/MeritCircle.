import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { updateProfileSchema } from "./profile.schema";
import { getProfile, updateProfile } from "./profile.service";

export const profileRouter: Router = Router();

// GET /api/profile
profileRouter.get(
  "/api/profile",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getProfile(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH & PUT /api/profile
const updateProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const result = await updateProfile(req.user!.id, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

profileRouter.patch("/api/profile", authMiddleware, updateProfileHandler);
profileRouter.put("/api/profile", authMiddleware, updateProfileHandler);

