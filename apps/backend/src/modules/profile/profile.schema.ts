import { z } from "zod";

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(
        /^[a-zA-Z0-9_-]{3,30}$/,
        "Username must be 3-30 alphanumeric characters, underscores, or dashes"
      )
      .optional()
      .nullable(),
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .optional()
      .nullable(),
    avatarUrl: z
      .string()
      .trim()
      .max(3 * 1024 * 1024, "Profile picture must be under 3MB")
      .refine(
        (val) =>
          !val ||
          val.startsWith("data:image/") ||
          val.startsWith("http://") ||
          val.startsWith("https://") ||
          val.startsWith("/"),
        { message: "Profile picture must be a valid image or URL" }
      )
      .optional()
      .nullable(),
    xUrl: z.string().trim().url("Invalid X URL").optional().nullable(),
    telegramUrl: z
      .string()
      .trim()
      .url("Invalid Telegram URL")
      .optional()
      .nullable(),
    discordHandle: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
