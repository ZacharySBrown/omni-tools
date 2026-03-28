import { z } from "zod";
import { NodeSchema, ConnectionSchema, LayoutType, ExportFormat } from "./diagram.js";

export const AnnotationStyle = z.enum(["callout", "label", "note"]);
export type AnnotationStyle = z.infer<typeof AnnotationStyle>;

export const AnnotationSchema = z.object({
  text: z.string(),
  anchor_node: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  style: AnnotationStyle.default("callout"),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

export const SlideOverrideSchema = z.object({
  title: z.string().optional(),
  visible_nodes: z.array(z.string()).optional(),
  hidden_nodes: z.array(z.string()).optional(),
  highlight_nodes: z.array(z.string()).optional(),
  highlight_connections: z.array(z.string()).optional(),
  dim_nodes: z.array(z.string()).optional(),
  dim_connections: z.array(z.string()).optional(),
  annotations: z.array(AnnotationSchema).optional(),
  add_nodes: z.array(NodeSchema).optional(),
  add_connections: z.array(ConnectionSchema).optional(),
  remove_connections: z.array(z.string()).optional(),
});
export type SlideOverride = z.infer<typeof SlideOverrideSchema>;

export const BaseDiagramSchema = z.object({
  nodes: z.array(NodeSchema),
  connections: z.array(ConnectionSchema),
  layout: LayoutType.default("manual"),
  style_preset: z.string().default("illustrated-technical"),
});

export const PresentationSpecInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  base_diagram: BaseDiagramSchema,
  slides: z.array(SlideOverrideSchema).min(1),
  save_path: z.string().optional().describe(
    "Directory to save the .graffle file. Ask the user for their preferred output directory on first use. Defaults to /tmp.",
  ),
  output_path: z.string().optional(),
  output_format: ExportFormat.optional(),
});

export const PresentationSpecSchema = PresentationSpecInputSchema
  .superRefine((spec, ctx) => {
    const baseNodeIds = new Set(spec.base_diagram.nodes.map((n) => n.id));
    for (let i = 0; i < spec.slides.length; i++) {
      const slide = spec.slides[i];
      if (slide.visible_nodes && slide.hidden_nodes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Slide ${i}: visible_nodes and hidden_nodes are mutually exclusive`,
          path: ["slides", i],
        });
      }
      const addedIds = new Set((slide.add_nodes ?? []).map((n) => n.id));
      const allIds = new Set([...baseNodeIds, ...addedIds]);
      const refArrays: [string, string[] | undefined][] = [
        ["visible_nodes", slide.visible_nodes],
        ["hidden_nodes", slide.hidden_nodes],
        ["highlight_nodes", slide.highlight_nodes],
        ["dim_nodes", slide.dim_nodes],
      ];
      for (const [field, ids] of refArrays) {
        for (const id of ids ?? []) {
          if (!allIds.has(id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Slide ${i} ${field}: unknown node ID "${id}"`,
              path: ["slides", i, field],
            });
          }
        }
      }
      for (const ann of slide.annotations ?? []) {
        if (ann.anchor_node && !allIds.has(ann.anchor_node)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Slide ${i} annotation: unknown anchor node "${ann.anchor_node}"`,
            path: ["slides", i, "annotations"],
          });
        }
      }
    }
  });

export type PresentationSpec = z.infer<typeof PresentationSpecSchema>;
