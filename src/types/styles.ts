import { z } from "zod";

export const StyleMetaSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
});

export const StyleColorsSchema = z.object({
  background: z.string(),
  surface: z.string(),
  surface_alt: z.string(),
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  accent_warm: z.string(),
  text_primary: z.string(),
  text_secondary: z.string(),
  text_on_primary: z.string(),
  text_on_secondary: z.string(),
  connector: z.string(),
  connector_highlight: z.string(),
  code_bg: z.string(),
  code_text: z.string(),
  border: z.string(),
  success: z.string(),
  warning: z.string(),
  danger: z.string(),
});

const SemanticRoleColorName = z.string();

export const SemanticRolesSchema = z.object({
  encoder: SemanticRoleColorName,
  decoder: SemanticRoleColorName,
  attention: SemanticRoleColorName,
  embedding: SemanticRoleColorName,
  output: SemanticRoleColorName,
  input: SemanticRoleColorName,
  intermediate: SemanticRoleColorName,
});

export const TypographySizesSchema = z.object({
  xxl: z.number(),
  xl: z.number(),
  lg: z.number(),
  md: z.number(),
  sm: z.number(),
  xs: z.number(),
  code: z.number(),
});

export const TypographyWeightsSchema = z.object({
  title: z.string(),
  label: z.string(),
  annotation: z.string(),
});

export const TypographySchema = z.object({
  heading_font: z.string(),
  body_font: z.string(),
  code_font: z.string(),
  label_font: z.string(),
  sizes: TypographySizesSchema,
  weights: TypographyWeightsSchema,
});

export const ShapesSchema = z.object({
  default_corner_radius: z.number(),
  node_corner_radius: z.number(),
  pill_corner_radius: z.number(),
  stroke_width_default: z.number(),
  stroke_width_emphasis: z.number(),
  stroke_width_subtle: z.number(),
  min_node_width: z.number(),
  min_node_height: z.number(),
  token_cell_width: z.number(),
  token_cell_height: z.number(),
  shadow: z.boolean(),
  shadow_blur: z.number(),
  shadow_offset_x: z.number(),
  shadow_offset_y: z.number(),
  shadow_color: z.string(),
});

export const ConnectorsSchema = z.object({
  default_stroke: z.string(),
  default_width: z.number(),
  arrow_style: z.enum(["FilledArrow", "OpenArrow", "StealthArrow"]),
  routing: z.enum(["orthogonal", "curved", "direct"]),
  label_font_size: z.number(),
});

export const LayoutSchema = z.object({
  canvas_width_slide: z.number(),
  canvas_height_slide: z.number(),
  canvas_width_diagram: z.number(),
  canvas_height_diagram: z.number(),
  margin: z.number(),
  node_h_spacing: z.number(),
  node_v_spacing: z.number(),
  title_margin_top: z.number(),
  content_margin_top: z.number(),
});

export const HandDrawnSchema = z.object({
  enabled: z.boolean(),
  stroke_width_multiplier: z.number(),
  corner_radius_override: z.number(),
  connector_routing_override: z.enum(["orthogonal", "curved", "direct"]),
  stroke_color_override: z.string(),
  wobble_amplitude: z.number(),
  wobble_frequency: z.number(),
  wobble_seed: z.number().optional(),
});

export const StyleTokensSchema = z.object({
  meta: StyleMetaSchema,
  colors: StyleColorsSchema,
  semantic_roles: SemanticRolesSchema,
  typography: TypographySchema,
  shapes: ShapesSchema,
  connectors: ConnectorsSchema,
  layout: LayoutSchema,
  hand_drawn: HandDrawnSchema.optional(),
});

export type StyleTokens = z.infer<typeof StyleTokensSchema>;
export type StyleColors = z.infer<typeof StyleColorsSchema>;
export type SemanticRoles = z.infer<typeof SemanticRolesSchema>;
