import { describe, it, expect } from "vitest";
import {
  ApplyStylePresetInputSchema,
  AddElementInputSchema,
  ExtractStyleInputSchema,
} from "../../src/types/diagram.js";

describe("ApplyStylePresetInputSchema", () => {
  it("accepts minimal input", () => {
    const result = ApplyStylePresetInputSchema.parse({ preset_name: "illustrated-technical" });
    expect(result.scope).toBe("current_canvas");
    expect(result.remap_by_role).toBe(true);
  });

  it("accepts full input", () => {
    const result = ApplyStylePresetInputSchema.parse({
      preset_name: "clean-academic",
      document_path: "/path/to/doc.graffle",
      scope: "all_canvases",
      remap_by_role: false,
    });
    expect(result.scope).toBe("all_canvases");
  });

  it("rejects missing preset_name", () => {
    expect(() => ApplyStylePresetInputSchema.parse({})).toThrow();
  });

  it("rejects invalid scope", () => {
    expect(() =>
      ApplyStylePresetInputSchema.parse({ preset_name: "x", scope: "first_canvas" }),
    ).toThrow();
  });
});

describe("AddElementInputSchema", () => {
  it("accepts minimal shape input", () => {
    const result = AddElementInputSchema.parse({ type: "shape", x: 100, y: 200 });
    expect(result.role).toBe("neutral");
    expect(result.style_preset).toBe("illustrated-technical");
  });

  it("accepts line input with connections", () => {
    const result = AddElementInputSchema.parse({
      type: "line",
      x: 0,
      y: 0,
      connect_from_name: "node_a",
      connect_to_name: "node_b",
    });
    expect(result.connect_from_name).toBe("node_a");
  });

  it("accepts text_annotation", () => {
    const result = AddElementInputSchema.parse({
      type: "text_annotation",
      label: "Note: this is important",
      x: 50,
      y: 50,
    });
    expect(result.type).toBe("text_annotation");
  });

  it("rejects missing x/y", () => {
    expect(() => AddElementInputSchema.parse({ type: "shape" })).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() =>
      AddElementInputSchema.parse({ type: "polygon", x: 0, y: 0 }),
    ).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      AddElementInputSchema.parse({ type: "shape", x: 0, y: 0, role: "bad" }),
    ).toThrow();
  });
});

describe("ExtractStyleInputSchema", () => {
  it("accepts minimal input", () => {
    const result = ExtractStyleInputSchema.parse({ output_preset_name: "my-style" });
    expect(result.document_path).toBeUndefined();
    expect(result.output_preset_path).toBeUndefined();
  });

  it("accepts full input", () => {
    const result = ExtractStyleInputSchema.parse({
      document_path: "/path/to/doc.graffle",
      output_preset_name: "extracted",
      output_preset_path: "/path/to/presets",
    });
    expect(result.output_preset_name).toBe("extracted");
  });

  it("rejects missing output_preset_name", () => {
    expect(() => ExtractStyleInputSchema.parse({})).toThrow();
  });
});
