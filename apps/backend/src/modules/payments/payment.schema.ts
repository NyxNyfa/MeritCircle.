import { z } from "zod";

export const paymentIntentSchema = z.object({
  cycleId: z.string().min(1),
});

export const confirmPaymentSchema = z
  .object({
    cycleId: z.string().optional(),
    contributionId: z.string().optional(),
    txHash: z.string().min(1, "txHash is required"),
  })
  .refine((data) => data.cycleId || data.contributionId, {
    message: "Either cycleId or contributionId must be provided",
  });

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
