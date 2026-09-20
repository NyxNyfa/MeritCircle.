import { z } from "zod";

export const groupIdParamSchema = z.object({
  groupId: z.string().min(1, "groupId is required"),
});

export type GroupIdParam = z.infer<typeof groupIdParamSchema>;
