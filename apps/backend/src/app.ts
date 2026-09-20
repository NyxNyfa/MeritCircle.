import express, { Express } from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./modules/auth/auth.routes";
import { profileRouter } from "./modules/profile/profile.routes";
import { emailRouter } from "./modules/email/email.routes";
import { reputationRouter } from "./modules/reputation/reputation.routes";
import { poolRouter } from "./modules/pools/pool.routes";
import { groupRouter } from "./modules/groups/group.routes";
import { cycleRouter } from "./modules/cycles/cycle.routes";
import { contributionRouter } from "./modules/contributions/contribution.routes";
import { paymentRouter } from "./modules/payments/payment.routes";
import { auctionRouter } from "./modules/auctions/auction.routes";
import { bidRouter } from "./modules/bids/bid.routes";
import { settlementRouter } from "./modules/settlements/settlement.routes";
import { rewardLedgerRouter } from "./modules/reward-ledger/reward-ledger.routes";
import { adminRouter } from "./modules/admin/admin.routes";

export function createApp(): Express {
  const app = express();

  // Global middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Module routers
  app.use(authRouter);
  app.use(profileRouter);
  app.use(emailRouter);
  app.use(reputationRouter);
  app.use(poolRouter);
  app.use(groupRouter);
  app.use(cycleRouter);
  app.use(contributionRouter);
  app.use(paymentRouter);
  app.use(auctionRouter);
  app.use(bidRouter);
  app.use(settlementRouter);
  app.use(rewardLedgerRouter);
  app.use(adminRouter);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
