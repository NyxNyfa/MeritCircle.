import { z } from "zod";

export const adjustReputationSchema = z.object({
  points: z.number().int(),
  reason: z.string().min(1, "Reason is required"),
});

export const createPoolSchema = z.object({
  externalPoolId: z.string().min(1, "externalPoolId is required"),
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  mode: z.enum(["BASIC", "AUCTION"]),
  minimumTier: z.number().int().min(1).max(5),
  groupSize: z.number().int().min(2),
  cycleDurationDays: z.number().int().positive(),
  paymentWindowDays: z.number().int().positive(),
  auctionOpenDay: z.number().int().nullable().optional(),
  auctionCloseDay: z.number().int().nullable().optional(),
  settlementDay: z.number().int().positive(),
  contributionAmountWei: z.string().min(1),
  maxDiscountBps: z.number().int().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PAUSED"]).optional(),
});

export const patchPoolSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  minimumTier: z.number().int().min(1).max(5).optional(),
  groupSize: z.number().int().min(2).optional(),
  cycleDurationDays: z.number().int().positive().optional(),
  paymentWindowDays: z.number().int().positive().optional(),
  auctionOpenDay: z.number().int().nullable().optional(),
  auctionCloseDay: z.number().int().nullable().optional(),
  settlementDay: z.number().int().positive().optional(),
  contributionAmountWei: z.string().min(1).optional(),
  maxDiscountBps: z.number().int().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PAUSED", "CLOSED"]).optional(),
});

export const fillDemoSchema = z.object({
  prefix: z.string().optional(),
});
