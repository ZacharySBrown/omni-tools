import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildAddElementScript } from "../../src/bridge/add-element.js";
import { loadPreset } from "../../src/styles/loader.js";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");
const preset = loadPreset("illustrated-technical");

describe("buildAddElementScript", () => {
  it("generates shape creation script", () => {
    const script = buildAddElementScript({
      type: "shape",
      label: "My Node",
      role: "encoder",
      x: 100,
      y: 200,
      preset,
    });
    expect(script).toContain('Application("OmniGraffle")');
    expect(script).toContain("evaluateJavascript");
    expect(script).toContain("canvas.addShape");
    expect(script).toContain("My Node");
    expect(script).toContain('"x":100');
    expect(script).toContain('"y":200');
  });

  it("generates line creation script with shape lookups", () => {
    const script = buildAddElementScript({
      type: "line",
      role: "neutral",
      x: 0,
      y: 0,
      connectFromName: "node_a",
      connectToName: "node_b",
      preset,
    });
    expect(script).toContain("evaluateJavascript");
    expect(script).toContain("canvas.connect");
    expect(script).toContain("node_a");
    expect(script).toContain("node_b");
  });

  it("generates text annotation script", () => {
    const script = buildAddElementScript({
      type: "text_annotation",
      label: "Note: important",
      role: "neutral",
      x: 50,
      y: 75,
      preset,
    });
    expect(script).toContain("Note: important");
    expect(script).toContain('"textColor"');
    expect(script).toContain('"x":50');
  });

  it("uses preset min dimensions for shapes without explicit size", () => {
    const script = buildAddElementScript({
      type: "shape",
      role: "neutral",
      x: 0,
      y: 0,
      preset,
    });
    expect(script).toContain(`"w":${preset.shapes.min_node_width}`);
    expect(script).toContain(`"h":${preset.shapes.min_node_height}`);
  });

  it("uses explicit dimensions when provided", () => {
    const script = buildAddElementScript({
      type: "shape",
      role: "neutral",
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      preset,
    });
    expect(script).toContain('"w":300');
    expect(script).toContain('"h":100');
  });
});
