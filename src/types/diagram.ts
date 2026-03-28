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
  xkcd_mode: z.boolean().default(false),
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
