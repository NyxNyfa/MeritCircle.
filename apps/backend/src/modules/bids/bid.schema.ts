import { z } from "zod";

export const submitBidSchema = z.object({
  payoutAmountWei: z
    .string()
    .min(1, "payoutAmountWei is required")
    .regex(/^\d+$/, "payoutAmountWei must be an integer string"),
});

export const auctionIdParamSchema = z.object({
  auctionId: z.string().min(1, "auctionId is required"),
});

export type SubmitBidInput = z.infer<typeof submitBidSchema>;
