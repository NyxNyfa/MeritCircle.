import { z } from "zod";

export const nonceRequestSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address format"),
});

export type NonceRequestInput = z.infer<typeof nonceRequestSchema>;

export const verifySignatureSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address format"),
  nonce: z.string().min(1, "Nonce is required"),
  signature: z.string().min(1, "Signature is required"),
});

export type VerifySignatureInput = z.infer<typeof verifySignatureSchema>;
