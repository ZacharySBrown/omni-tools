import { describe, it, expect } from "vitest";
import { buildPresetFromSamples, rgbToHex, type ShapeSample } from "../../src/styles/extractor.js";
import { StyleTokensSchema } from "../../src/types/styles.js";

describe("rgbToHex", () => {
  it("converts 0,0,0 to #000000", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });

  it("converts 1,1,1 to #FFFFFF", () => {
    expect(rgbToHex(1, 1, 1)).toBe("#FFFFFF");
  });

  it("converts fractional RGB to hex", () => {
    expect(rgbToHex(0.29, 0.565, 0.851)).toBe("#4A90D9");
  });
});

const makeSample = (overrides: Partial<ShapeSample> = {}): ShapeSample => ({
  fillR: 0.29,
  fillG: 0.565,
  fillB: 0.851,
  strokeR: 0.29,
  strokeG: 0.337,
  strokeB: 0.412,
  textR: 0.1,
  textG: 0.1,
  textB: 0.18,
  font: "Helvetica Neue",
  textSize: 16,
  strokeWidth: 1.5,
  cornerRadius: 8,
  width: 120,
  height: 48,
  name: "",
  ...overrides,
});

describe("buildPresetFromSamples", () => {
  it("produces valid StyleTokens from samples", () => {
    const samples = [
      makeSample(),
      makeSample({ fillR: 0.91, fillG: 0.47, fillB: 0.47 }), // secondary
      makeSample({ fillR: 0.41, fillG: 0.76, fillB: 0.64 }), // accent
    ];

    const preset = buildPresetFromSamples(samples, "test-extracted");
    expect(() => StyleTokensSchema.parse(preset)).not.toThrow();
    expect(preset.meta.name).toBe("test-extracted");
    expect(preset.meta.description).toContain("3 shapes");
  });

  it("uses most common color as primary", () => {
    const samples = [
      makeSample({ fillR: 0.29, fillG: 0.565, fillB: 0.851 }),
      makeSample({ fillR: 0.29, fillG: 0.565, fillB: 0.851 }),
      makeSample({ fillR: 0.91, fillG: 0.47, fillB: 0.47 }),
    ];

    const preset = buildPresetFromSamples(samples, "test");
    expect(preset.colors.primary).toBe("#4A90D9");
  });

  it("uses most common font", () => {
    const samples = [
      makeSample({ font: "Avenir" }),
      makeSample({ font: "Avenir" }),
      makeSample({ font: "Menlo" }),
    ];

    const preset = buildPresetFromSamples(samples, "test");
    expect(preset.typography.heading_font).toBe("Avenir");
  });

  it("throws on empty samples", () => {
    expect(() => buildPresetFromSamples([], "empty")).toThrow("No shape samples");
  });

  it("scales typography sizes from sampled base", () => {
    const samples = [makeSample({ textSize: 20 })];
    const preset = buildPresetFromSamples(samples, "test");
    expect(preset.typography.sizes.md).toBe(20);
    expect(preset.typography.sizes.xxl).toBe(60); // 20 * 3
  });
});
