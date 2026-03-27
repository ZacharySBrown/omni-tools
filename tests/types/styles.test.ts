import { describe, it, expect } from "vitest";
import { StyleTokensSchema } from "../../src/types/styles.js";

const validPreset = {
  meta: { name: "test", description: "Test preset", version: "1.0.0" },
  colors: {
    background: "#FFFFFF",
    surface: "#F0F4FF",
    surface_alt: "#FFF0F5",
    primary: "#4A90D9",
    secondary: "#E87878",
    accent: "#68C3A3",
    accent_warm: "#F5A623",
    text_primary: "#1A1A2E",
    text_secondary: "#6B7280",
    text_on_primary: "#FFFFFF",
    text_on_secondary: "#FFFFFF",
    connector: "#4A5568",
    connector_highlight: "#F5A623",
    code_bg: "#F7F8FA",
    code_text: "#2D3748",
    border: "#E2E8F0",
    success: "#48BB78",
    warning: "#ED8936",
    danger: "#FC8181",
  },
  semantic_roles: {
    encoder: "primary",
    decoder: "secondary",
    attention: "accent_warm",
    embedding: "accent",
    output: "success",
    input: "surface",
    intermediate: "surface_alt",
  },
  typography: {
    heading_font: "Helvetica Neue",
    body_font: "Helvetica Neue",
    code_font: "Menlo",
    label_font: "Helvetica Neue",
    sizes: { xxl: 48, xl: 32, lg: 22, md: 16, sm: 12, xs: 10, code: 13 },
    weights: { title: "Bold", label: "Medium", annotation: "Regular" },
  },
  shapes: {
    default_corner_radius: 8,
    node_corner_radius: 8,
    pill_corner_radius: 20,
    stroke_width_default: 1.5,
    stroke_width_emphasis: 2.5,
    stroke_width_subtle: 0.5,
    min_node_width: 120,
    min_node_height: 48,
    token_cell_width: 80,
    token_cell_height: 40,
    shadow: false,
    shadow_blur: 0,
    shadow_offset_x: 0,
    shadow_offset_y: 0,
    shadow_color: "#00000020",
  },
  connectors: {
    default_stroke: "#4A5568",
    default_width: 2.0,
    arrow_style: "FilledArrow" as const,
    routing: "orthogonal" as const,
    label_font_size: 11,
  },
  layout: {
    canvas_width_slide: 1920,
    canvas_height_slide: 1080,
    canvas_width_diagram: 1600,
    canvas_height_diagram: 1200,
    margin: 80,
    node_h_spacing: 60,
    node_v_spacing: 40,
    title_margin_top: 60,
    content_margin_top: 140,
  },
};

describe("StyleTokensSchema", () => {
  it("accepts a valid preset", () => {
    expect(() => StyleTokensSchema.parse(validPreset)).not.toThrow();
  });

  it("rejects preset missing meta", () => {
    const { meta: _meta, ...rest } = validPreset;
    expect(() => StyleTokensSchema.parse(rest)).toThrow();
  });

  it("rejects preset missing colors", () => {
    const { colors: _colors, ...rest } = validPreset;
    expect(() => StyleTokensSchema.parse(rest)).toThrow();
  });

  it("rejects preset with invalid arrow_style", () => {
    const bad = {
      ...validPreset,
      connectors: { ...validPreset.connectors, arrow_style: "InvalidArrow" },
    };
    expect(() => StyleTokensSchema.parse(bad)).toThrow();
  });

  it("rejects preset with invalid routing", () => {
    const bad = {
      ...validPreset,
      connectors: { ...validPreset.connectors, routing: "zigzag" },
    };
    expect(() => StyleTokensSchema.parse(bad)).toThrow();
  });

  it("rejects empty object", () => {
    expect(() => StyleTokensSchema.parse({})).toThrow();
  });
});
