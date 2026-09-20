import { z } from "zod";

export const reputationResponseSchema = z.object({
  points: z.number().int().min(0).max(1000),
  tier: z.number().int().min(1).max(5),
  tierName: z.string(),
  maxActiveGroups: z.number().int(),
  nextTierPoints: z.number().int().nullable(),
});

export type ReputationResponse = z.infer<typeof reputationResponseSchema>;
