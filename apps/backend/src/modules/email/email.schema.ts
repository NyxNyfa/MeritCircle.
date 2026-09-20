import { z } from "zod";

export const confirmEmailSchema = z.object({
  code: z.string().min(4).max(10),
});

export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
