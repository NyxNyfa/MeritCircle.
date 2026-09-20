import { z } from "zod";

export const cycleIdParamSchema = z.object({
  cycleId: z.string().min(1, "cycleId is required"),
});

export type CycleIdParam = z.infer<typeof cycleIdParamSchema>;
