import { z } from "zod";
import { StyleTokensSchema } from "../types/styles.js";

export const UserConfigSchema = z.object({
  default_preset: z.string().optional(),
  default_export_format: z.string().optional(),
  default_canvas_type: z.string().optional(),
  preset_dirs: z.array(z.string()).optional(),
  style_overrides: StyleTokensSchema.deepPartial().optional(),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;

export const DEFAULT_USER_CONFIG: UserConfig = {};
