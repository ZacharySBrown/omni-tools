import { z } from "zod";

export const SemanticRole = z.enum([
  "encoder",
  "decoder",
  "attention",
  "embedding",
  "output",
  "input",
  "intermediate",
  "neutral",
]);
export type SemanticRole = z.infer<typeof SemanticRole>;

export const NodeShape = z.enum([
  "rectangle",
  "rounded_rectangle",
  "diamond",
  "circle",
  "token_cell",
  "pill",
  "annotation",
]);
export type NodeShape = z.infer<typeof NodeShape>;

export const ConnectionStyle = z.enum([
  "default",
  "highlight",
  "dashed",
  "bidirectional",
]);
export type ConnectionStyle = z.infer<typeof ConnectionStyle>;

export const LayoutType = z.enum([
  "auto_hierarchical",
  "auto_force",
  "auto_circular",
  "manual",
]);
export type LayoutType = z.infer<typeof LayoutType>;

export const CanvasType = z.enum(["diagram", "slide"]);
export type CanvasType = z.infer<typeof CanvasType>;

export const ExportFormat = z.enum(["pdf", "svg", "png", "tiff"]);
export type ExportFormat = z.infer<typeof ExportFormat>;

export const NodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  role: SemanticRole.default("neutral"),
  shape: NodeShape.default("rounded_rectangle"),
  color_override: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sublabel: z.string().optional(),
});
export type DiagramNode = z.infer<typeof NodeSchema>;

export const ConnectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  style: ConnectionStyle.default("default"),
  color_override: z.string().optional(),
});
export type DiagramConnection = z.infer<typeof ConnectionSchema>;

export const CreateDiagramInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  nodes: z.array(NodeSchema),
  connections: z.array(ConnectionSchema),
  layout: LayoutType.default("auto_hierarchical"),
  canvas_type: CanvasType.default("diagram"),
  style_preset: z.string().default("illustrated-technical"),
  output_path: z.string().optional(),
  output_format: ExportFormat.optional(),
});
export type CreateDiagramInput = z.infer<typeof CreateDiagramInputSchema>;

export const ExportDiagramInputSchema = z.object({
  document_path: z.string().optional(),
  output_path: z.string(),
  format: ExportFormat,
  canvas_name: z.string().optional(),
  dpi: z.number().default(144),
});
export type ExportDiagramInput = z.infer<typeof ExportDiagramInputSchema>;

export const ListStylePresetsInputSchema = z.object({});
export type ListStylePresetsInput = z.infer<typeof ListStylePresetsInputSchema>;

// --- Phase 2 schemas ---

export const ElementType = z.enum(["shape", "line", "text_annotation"]);
export type ElementType = z.infer<typeof ElementType>;

export const ApplyStylePresetInputSchema = z.object({
  preset_name: z.string(),
  document_path: z.string().optional(),
  scope: z.enum(["all_canvases", "current_canvas"]).default("current_canvas"),
  remap_by_role: z.boolean().default(true),
});
export type ApplyStylePresetInput = z.infer<typeof ApplyStylePresetInputSchema>;

export const AddElementInputSchema = z.object({
  type: ElementType,
  label: z.string().optional(),
  role: SemanticRole.default("neutral"),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  connect_from_name: z.string().optional(),
  connect_to_name: z.string().optional(),
  style_preset: z.string().default("illustrated-technical"),
});
export type AddElementInput = z.infer<typeof AddElementInputSchema>;

export const ExtractStyleInputSchema = z.object({
  document_path: z.string().optional(),
  output_preset_name: z.string(),
  output_preset_path: z.string().optional(),
});
export type ExtractStyleInput = z.infer<typeof ExtractStyleInputSchema>;
