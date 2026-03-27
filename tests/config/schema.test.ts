import { describe, it, expect } from "vitest";
import { UserConfigSchema } from "../../src/config/schema.js";

describe("UserConfigSchema", () => {
  it("parses a valid full config", () => {
    const config = {
      default_preset: "illustrated-technical",
      default_export_format: "png",
      default_canvas_type: "diagram",
      preset_dirs: ["/Users/test/presets"],
      style_overrides: {
        colors: {
          primary: "#FF0000",
        },
      },
    };
    const result = UserConfigSchema.parse(config);
    expect(result.default_preset).toBe("illustrated-technical");
    expect(result.preset_dirs).toEqual(["/Users/test/presets"]);
    expect(result.style_overrides?.colors?.primary).toBe("#FF0000");
  });

  it("parses an empty config (all fields optional)", () => {
    const result = UserConfigSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects invalid fields", () => {
    const config = {
      default_preset: 123, // should be string
    };
    expect(() => UserConfigSchema.parse(config)).toThrow();
  });

  it("accepts partial style_overrides", () => {
    const config = {
      style_overrides: {
        layout: {
          margin: 20,
        },
      },
    };
    const result = UserConfigSchema.parse(config);
    expect(result.style_overrides?.layout?.margin).toBe(20);
  });

  it("accepts style_overrides with only nested fields", () => {
    const config = {
      style_overrides: {
        typography: {
          heading_font: "Helvetica",
        },
        shapes: {
          shadow: false,
        },
      },
    };
    const result = UserConfigSchema.parse(config);
    expect(result.style_overrides?.typography?.heading_font).toBe(
      "Helvetica",
    );
    expect(result.style_overrides?.shapes?.shadow).toBe(false);
  });
});
