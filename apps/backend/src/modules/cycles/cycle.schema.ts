import { z } from "zod";

export const getCycleSchema = z.object({
  cycleId: z.string().min(1),
});
