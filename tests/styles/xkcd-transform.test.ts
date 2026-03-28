import { describe, it, expect } from "vitest";
import * as path from "path";
import { loadPreset } from "../../src/styles/loader.js";
import { applyXkcdTransform } from "../../src/styles/xkcd-transform.js";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

const preset = loadPreset("illustrated-technical");

describe("applyXkcdTransform", () => {
  it("returns a valid StyleTokens object", () => {
    const result = applyXkcdTransform(preset);
    expect(result.meta).toBeDefined();
    expect(result.colors).toBeDefined();
    expect(result.typography).toBeDefined();
  });

  it("overrides fonts to Humor Sans", () => {
    const result = applyXkcdTransform(preset);
    expect(result.typography.heading_font).toBe("Humor Sans");
    expect(result.typography.body_font).toBe("Humor Sans");
    expect(result.typography.label_font).toBe("Humor Sans");
    expect(result.typography.code_font).toBe("Humor Sans");
  });

  it("desaturates semantic colors", () => {
    const result = applyXkcdTransform(preset);
    // Original primary is #4A90D9 (blue) — after 80% desaturation it should be grayish
    expect(result.colors.primary).not.toBe(preset.colors.primary);
    expect(result.colors.secondary).not.toBe(preset.colors.secondary);
    expect(result.colors.accent).not.toBe(preset.colors.accent);
  });

  it("forces black connectors", () => {
    const result = applyXkcdTransform(preset);
    expect(result.colors.connector).toBe("#000000");
    expect(result.colors.connector_highlight).toBe("#000000");
  });

  it("forces black text", () => {
    const result = applyXkcdTransform(preset);
    expect(result.colors.text_primary).toBe("#000000");
  });

  it("multiplies stroke widths", () => {
    const result = applyXkcdTransform(preset);
    expect(result.shapes.stroke_width_default).toBeCloseTo(
      preset.shapes.stroke_width_default * 1.8,
    );
    expect(result.shapes.stroke_width_emphasis).toBeCloseTo(
      preset.shapes.stroke_width_emphasis * 1.8,
    );
  });

  it("sets corner radius to 2", () => {
    const result = applyXkcdTransform(preset);
    expect(result.shapes.node_corner_radius).toBe(2);
  });

  it("disables shadows", () => {
    const result = applyXkcdTransform(preset);
    expect(result.shapes.shadow).toBe(false);
  });

  it("switches connector routing to curved", () => {
    const result = applyXkcdTransform(preset);
    expect(result.connectors.routing).toBe("curved");
  });

  it("injects hand_drawn section", () => {
    const result = applyXkcdTransform(preset);
    expect(result.hand_drawn).toBeDefined();
    expect(result.hand_drawn!.enabled).toBe(true);
    expect(result.hand_drawn!.wobble_amplitude).toBe(3.0);
    expect(result.hand_drawn!.wobble_frequency).toBe(0.15);
  });

  it("preserves existing hand_drawn if preset already has one", () => {
    const presetWithHandDrawn = {
      ...preset,
      hand_drawn: {
        enabled: true,
        stroke_width_multiplier: 2.5,
        corner_radius_override: 1,
        connector_routing_override: "curved" as const,
        stroke_color_override: "#333333",
        wobble_amplitude: 5.0,
        wobble_frequency: 0.2,
      },
    };
    const result = applyXkcdTransform(presetWithHandDrawn);
    expect(result.hand_drawn!.wobble_amplitude).toBe(5.0);
    expect(result.hand_drawn!.stroke_color_override).toBe("#333333");
  });

  it("does not mutate the original preset", () => {
    const originalPrimary = preset.colors.primary;
    applyXkcdTransform(preset);
    expect(preset.colors.primary).toBe(originalPrimary);
    expect(preset.typography.heading_font).toBe("Helvetica Neue");
  });

  it("multiplies connector widths", () => {
    const result = applyXkcdTransform(preset);
    expect(result.connectors.default_width).toBeCloseTo(
      preset.connectors.default_width * 1.8,
    );
  });
});
