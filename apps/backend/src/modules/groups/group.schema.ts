import { z } from "zod";

export const getGroupSchema = z.object({
  groupId: z.string().min(1),
});
