import { Router, Request, Response, NextFunction } from "express";
import { adminGuard } from "./admin.guard";
import { AppError } from "../../middleware/error";
import {
  adjustReputationSchema,
  createPoolSchema,
  patchPoolSchema,
  fillDemoSchema,
} from "./admin.schema";
import {
  getOverview,
  getUsers,
  getUser,
  adjustReputation,
  getPools,
  createPool,
  patchPool,
  deletePool,
  getGroups,
  getGroup,
  fillDemoGroup,
  getAuditLogs,
} from "./admin.service";

export const adminRouter: Router = Router();

/* =========================================================================
 * HEALTH CHECK ENDPOINT
 * ========================================================================= */
adminRouter.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "merit-circle-backend",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================================
 * ADMIN OVERVIEW
 * ========================================================================= */
adminRouter.get(
  "/api/admin/overview",
  adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getOverview();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================================
 * ADMIN USERS
 * ========================================================================= */
adminRouter.get(
  "/api/admin/users",
  adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getUsers();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/api/admin/users/:userId",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getUser(req.params.userId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/api/admin/users/:userId/reputation/adjust",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = adjustReputationSchema.parse(req.body);
      const data = await adjustReputation(
        req.user!.id,
        req.params.userId,
        parsed.points,
        parsed.reason
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================================
 * ADMIN POOLS
 * ========================================================================= */
adminRouter.get(
  "/api/admin/pools",
  adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getPools();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/api/admin/pools",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === "production" || process.env.STRICT_ONCHAIN === "true") {
        throw new AppError(
          "Dynamic pool creation is disabled. Pool blueprints must be deployed on-chain on MeritCircleCore smart contract.",
          400,
          "POOL_CREATION_DISABLED"
        );
      }
      const parsed = createPoolSchema.parse(req.body);
      const data = await createPool(req.user!.id, parsed);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.patch(
  "/api/admin/pools/:poolId",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = patchPoolSchema.parse(req.body);
      const data = await patchPool(req.user!.id, req.params.poolId, parsed);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.delete(
  "/api/admin/pools/:poolId",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === "production" || process.env.STRICT_ONCHAIN === "true") {
        throw new AppError(
          "Pool deletion is disabled. On-chain pools are immutable smart contract blueprints.",
          400,
          "POOL_DELETION_DISABLED"
        );
      }
      const data = await deletePool(req.user!.id, req.params.poolId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================================
 * ADMIN GROUPS
 * ========================================================================= */
adminRouter.get(
  "/api/admin/groups",
  adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getGroups();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/api/admin/groups/:groupId",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getGroup(req.params.groupId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/api/admin/groups/:groupId/fill-demo",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === "production") {
        throw new AppError("Fill demo is disabled in production environment.", 403, "DEMO_DISABLED");
      }
      const parsed = fillDemoSchema.parse(req.body || {});
      const data = await fillDemoGroup(req.user!.id, req.params.groupId, parsed.prefix);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================================
 * ADMIN AUDIT LOGS
 * ========================================================================= */
adminRouter.get(
  "/api/admin/audit-logs",
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const data = await getAuditLogs(limit, offset);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);
