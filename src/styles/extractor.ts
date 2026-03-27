import { StyleTokensSchema, type StyleTokens } from "../types/styles.js";

export interface ShapeSample {
  fillR: number;
  fillG: number;
  fillB: number;
  strokeR: number;
  strokeG: number;
  strokeB: number;
  textR: number;
  textG: number;
  textB: number;
  font: string;
  textSize: number;
  strokeWidth: number;
  cornerRadius: number;
  width: number;
  height: number;
  name: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const rr = clamp(r).toString(16).padStart(2, "0");
  const gg = clamp(g).toString(16).padStart(2, "0");
  const bb = clamp(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`.toUpperCase();
}

function mode<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const counts = new Map<string, { value: T; count: number }>();
  for (const v of arr) {
    const key = JSON.stringify(v);
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { value: v, count: 1 });
    }
  }
  let best: { value: T; count: number } | undefined;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.value;
}

function topColors(samples: ShapeSample[], field: "fill" | "stroke" | "text"): string[] {
  const hexes = samples.map((s) => {
    const r = s[`${field}R` as keyof ShapeSample] as number;
    const g = s[`${field}G` as keyof ShapeSample] as number;
    const b = s[`${field}B` as keyof ShapeSample] as number;
    return rgbToHex(r, g, b);
  });

  // Count frequencies, return sorted by frequency descending
  const counts = new Map<string, number>();
  for (const hex of hexes) {
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
}

export function buildPresetFromSamples(
  samples: ShapeSample[],
  name: string,
): StyleTokens {
  if (samples.length === 0) {
    throw new Error("No shape samples to extract style from");
  }

  const fillColors = topColors(samples, "fill");
  const textColors = topColors(samples, "text");
  const strokeColors = topColors(samples, "stroke");

  // Map top fill colors to semantic slots
  const primary = fillColors[0] ?? "#4A90D9";
  const secondary = fillColors[1] ?? "#E87878";
  const accent = fillColors[2] ?? "#68C3A3";
  const accentWarm = fillColors[3] ?? "#F5A623";
  const surface = fillColors[4] ?? "#F0F4FF";
  const surfaceAlt = fillColors[5] ?? "#FFF0F5";

  const textPrimary = textColors[0] ?? "#1A1A2E";
  const textSecondary = textColors[1] ?? "#6B7280";

  const fontName = mode(samples.map((s) => s.font).filter(Boolean)) ?? "Helvetica Neue";
  const fontSize = mode(samples.map((s) => s.textSize).filter((s) => s > 0)) ?? 16;
  const cornerRadius = mode(samples.map((s) => s.cornerRadius).filter((s) => s >= 0)) ?? 8;
  const strokeWidth = mode(samples.map((s) => s.strokeWidth).filter((s) => s > 0)) ?? 1.5;

  const raw = {
    meta: {
      name,
      description: `Extracted from OmniGraffle document (${samples.length} shapes sampled)`,
      version: "1.0.0",
    },
    colors: {
      background: "#FFFFFF",
      surface,
      surface_alt: surfaceAlt,
      primary,
      secondary,
      accent,
      accent_warm: accentWarm,
      text_primary: textPrimary,
      text_secondary: textSecondary,
      text_on_primary: "#FFFFFF",
      text_on_secondary: "#FFFFFF",
      connector: strokeColors[0] ?? "#4A5568",
      connector_highlight: accentWarm,
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
      heading_font: fontName,
      body_font: fontName,
      code_font: "Menlo",
      label_font: fontName,
      sizes: {
        xxl: Math.round(fontSize * 3),
        xl: Math.round(fontSize * 2),
        lg: Math.round(fontSize * 1.375),
        md: fontSize,
        sm: Math.round(fontSize * 0.75),
        xs: Math.round(fontSize * 0.625),
        code: Math.round(fontSize * 0.8125),
      },
      weights: {
        title: "Bold",
        label: "Medium",
        annotation: "Regular",
      },
    },
    shapes: {
      default_corner_radius: cornerRadius,
      node_corner_radius: cornerRadius,
      pill_corner_radius: Math.round(cornerRadius * 2.5),
      stroke_width_default: strokeWidth,
      stroke_width_emphasis: strokeWidth * 1.67,
      stroke_width_subtle: strokeWidth * 0.33,
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
      default_stroke: strokeColors[0] ?? "#4A5568",
      default_width: strokeWidth,
      arrow_style: "FilledArrow" as const,
      routing: "orthogonal" as const,
      label_font_size: Math.round(fontSize * 0.6875),
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

  return StyleTokensSchema.parse(raw);
}

export { rgbToHex };
