import { z } from "zod";

export const ReviewSeverity = z.enum(["error", "warning", "info"]);
export type ReviewSeverity = z.infer<typeof ReviewSeverity>;

export const ReviewFinding = z.object({
  checkId: z.string(),
  severity: ReviewSeverity,
  message: z.string(),
  shapeName: z.string().optional(),
  shapeText: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ReviewFinding = z.infer<typeof ReviewFinding>;

export const ReviewResult = z.object({
  diagramTitle: z.string(),
  canvasName: z.string(),
  shapeCount: z.number(),
  lineCount: z.number(),
  findings: z.array(ReviewFinding),
  prompts: z.array(z.object({
    checkId: z.string(),
    prompt: z.string(),
  })),
  summary: z.object({
    errors: z.number(),
    warnings: z.number(),
    infos: z.number(),
  }),
});
export type ReviewResult = z.infer<typeof ReviewResult>;

export const FixApplied = z.object({
  checkId: z.string(),
  shapeName: z.string(),
  description: z.string(),
  before: z.record(z.unknown()),
  after: z.record(z.unknown()),
});
export type FixApplied = z.infer<typeof FixApplied>;

export const ReviewDiagramInputSchema = z.object({
  checks: z.array(z.string()).optional().describe(
    "Specific check IDs to run. If omitted, runs all checks."
  ),
  severity_filter: ReviewSeverity.optional().describe(
    "Minimum severity to report. 'error' shows only errors, 'info' shows everything."
  ),
  auto_fix: z.boolean().optional().describe(
    "Automatically fix detected issues in-place (e.g., widen shapes for text overflow). Default false."
  ),
});
export type ReviewDiagramInput = z.infer<typeof ReviewDiagramInputSchema>;
