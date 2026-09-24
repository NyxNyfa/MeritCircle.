import { z } from "zod";

export const paymentIntentSchema = z
  .object({
    cycleId: z.string().optional(),
    contributionId: z.string().optional(),
  })
  .refine((data) => data.cycleId || data.contributionId, {
    message: "Either cycleId or contributionId must be provided",
  });

export const confirmPaymentSchema = z
  .object({
    cycleId: z.string().optional(),
    contributionId: z.string().optional(),
    paymentIntentId: z.string().optional(),
    txHash: z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/, "txHash must be a 32-byte hex transaction hash")
      .transform((value) => value.toLowerCase()),
  })
  .refine((data) => data.cycleId || data.contributionId || data.paymentIntentId, {
    message: "Either cycleId, contributionId, or paymentIntentId must be provided",
  });

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

