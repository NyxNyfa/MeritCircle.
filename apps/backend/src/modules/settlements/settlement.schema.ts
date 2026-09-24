import { z } from "zod";

export const settleCycleSchema = z.object({
  recipientUserId: z.string().optional(),
  forceSettle: z.boolean().optional(),
});

export const timeBasedSettleSchema = z.object({
  forceEpochExpiry: z.boolean().optional(),
  recipientUserId: z.string().optional(),
});

export const cycleIdParamSchema = z.object({
  cycleId: z.string().min(1, "cycleId is required"),
});

export type SettleCycleInput = z.infer<typeof settleCycleSchema>;
export type TimeBasedSettleInput = z.infer<typeof timeBasedSettleSchema>;
