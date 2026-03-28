import type { StyleTokens } from "../types/styles.js";

const XKCD_HAND_DRAWN = {
  enabled: true,
  stroke_width_multiplier: 1.8,
  corner_radius_override: 2,
  connector_routing_override: "curved" as const,
  stroke_color_override: "#000000",
  wobble_amplitude: 3.0,
  wobble_frequency: 0.15,
};

const XKCD_FONTS = {
  heading_font: "Humor Sans",
  body_font: "Humor Sans",
  code_font: "Humor Sans",
  label_font: "Humor Sans",
};

/**
 * Desaturate a hex color toward grayscale, keeping luminance.
 * amount=1.0 is fully gray, amount=0.0 is no change.
 */
function desaturate(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const nr = Math.round(r + (gray - r) * amount);
  const ng = Math.round(g + (gray - g) * amount);
  const nb = Math.round(b + (gray - b) * amount);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

/**
 * Apply xkcd-style transform to any preset.
 * Works like matplotlib's plt.xkcd() — a modifier on top of existing styles.
 */
export function applyXkcdTransform(preset: StyleTokens): StyleTokens {
  const colors = { ...preset.colors };

  // Desaturate semantic colors heavily (80%) — keep structure but lose color
  colors.primary = desaturate(colors.primary, 0.8);
  colors.secondary = desaturate(colors.secondary, 0.8);
  colors.accent = desaturate(colors.accent, 0.8);
  colors.accent_warm = desaturate(colors.accent_warm, 0.8);
  colors.success = desaturate(colors.success, 0.8);
  colors.warning = desaturate(colors.warning, 0.8);
  colors.danger = desaturate(colors.danger, 0.8);

  // Force black connectors and borders
  colors.connector = "#000000";
  colors.connector_highlight = "#000000";
  colors.border = "#000000";

  // Force black text
  colors.text_primary = "#000000";
  colors.text_secondary = "#333333";

  return {
    ...preset,
    colors,
    typography: {
      ...preset.typography,
      ...XKCD_FONTS,
    },
    shapes: {
      ...preset.shapes,
      node_corner_radius: XKCD_HAND_DRAWN.corner_radius_override,
      stroke_width_default: preset.shapes.stroke_width_default * XKCD_HAND_DRAWN.stroke_width_multiplier,
      stroke_width_emphasis: preset.shapes.stroke_width_emphasis * XKCD_HAND_DRAWN.stroke_width_multiplier,
      shadow: false,
    },
    connectors: {
      ...preset.connectors,
      routing: "curved",
      default_width: preset.connectors.default_width * XKCD_HAND_DRAWN.stroke_width_multiplier,
    },
    hand_drawn: preset.hand_drawn ?? XKCD_HAND_DRAWN,
  };
}
