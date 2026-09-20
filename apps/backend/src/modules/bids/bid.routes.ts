import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth";
import { submitBidSchema } from "./bid.schema";
import { submitBid, getAuctionBids, getAuctionResult } from "./bid.service";

export const bidRouter: Router = Router();

// POST /api/auctions/:auctionId/bids
bidRouter.post(
  "/api/auctions/:auctionId/bids",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = submitBidSchema.parse(req.body);
      const result = await submitBid(
        req.user!.id,
        req.params.auctionId,
        parsedBody.payoutAmountWei
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auctions/:auctionId/bids
bidRouter.get(
  "/api/auctions/:auctionId/bids",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getAuctionBids(req.user!.id, req.params.auctionId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auctions/:auctionId/result
bidRouter.get(
  "/api/auctions/:auctionId/result",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getAuctionResult(req.user!.id, req.params.auctionId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
