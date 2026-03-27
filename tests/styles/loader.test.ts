import { describe, it, expect, beforeAll } from "vitest";
import * as path from "path";
import { loadPreset, listPresets, resolveSemanticColor, resolveTextColor } from "../../src/styles/loader.js";

const PRESETS_DIR = path.join(process.cwd(), "presets");

beforeAll(() => {
  process.env.DIAGRAMMER_PRESETS_DIR = PRESETS_DIR;
});

describe("loadPreset", () => {
  it("loads illustrated-technical preset", () => {
    const preset = loadPreset("illustrated-technical");
    expect(preset.meta.name).toBe("illustrated-technical");
    expect(preset.colors.primary).toBeTruthy();
    expect(preset.connectors.arrow_style).toBe("FilledArrow");
  });

  it("loads clean-academic preset", () => {
    const preset = loadPreset("clean-academic");
    expect(preset.meta.name).toBe("clean-academic");
    expect(preset.colors.primary).toBeTruthy();
    expect(preset.shapes.default_corner_radius).toBeGreaterThan(0);
  });

  it("throws for nonexistent preset", () => {
    expect(() => loadPreset("nonexistent")).toThrow("Style preset not found");
  });
});

describe("listPresets", () => {
  it("returns both built-in presets", () => {
    const presets = listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(2);
    const names = presets.map((p) => p.name);
    expect(names).toContain("illustrated-technical");
    expect(names).toContain("clean-academic");
  });

  it("includes description and version", () => {
    const presets = listPresets();
    for (const p of presets) {
      expect(p.description).toBeTruthy();
      expect(p.version).toBeTruthy();
    }
  });
});

describe("resolveSemanticColor", () => {
  it("resolves encoder to primary color", () => {
    const preset = loadPreset("illustrated-technical");
    expect(resolveSemanticColor(preset, "encoder")).toBe(preset.colors.primary);
  });

  it("resolves decoder to secondary color", () => {
    const preset = loadPreset("illustrated-technical");
    expect(resolveSemanticColor(preset, "decoder")).toBe(preset.colors.secondary);
  });

  it("resolves attention to accent_warm color", () => {
    const preset = loadPreset("illustrated-technical");
    expect(resolveSemanticColor(preset, "attention")).toBe(preset.colors.accent_warm);
  });

  it("falls back to surface for unknown role", () => {
    const preset = loadPreset("illustrated-technical");
    expect(resolveSemanticColor(preset, "unknown")).toBe(preset.colors.surface);
  });
});

describe("resolveTextColor", () => {
  it("returns text_on_primary for dark-background roles", () => {
    const preset = loadPreset("illustrated-technical");
    expect(resolveTextColor(preset, "encoder")).toBe(preset.colors.text_on_primary);
    expect(resolveTextColor(preset, "decoder")).toBe(preset.colors.text_on_primary);
  });

  it("returns text_primary for light-background roles", () => {
    const preset = loadPreset("illustrated-technical");
    expect(resolveTextColor(preset, "input")).toBe(preset.colors.text_primary);
    expect(resolveTextColor(preset, "neutral")).toBe(preset.colors.text_primary);
  });
});
