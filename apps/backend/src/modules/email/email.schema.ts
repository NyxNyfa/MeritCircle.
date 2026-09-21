import { z } from "zod";

export const requestEmailSchema = z.object({
  email: z.string().trim().email("Invalid email format").optional(),
});

export type RequestEmailInput = z.infer<typeof requestEmailSchema>;

export const confirmEmailSchema = z.object({
  code: z.string().min(4).max(10),
});

export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;

