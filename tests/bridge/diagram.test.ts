import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildDiagramScript } from "../../src/bridge/diagram.js";
import { loadPreset } from "../../src/styles/loader.js";
import type { DiagramNode, DiagramConnection } from "../../src/types/diagram.js";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

const preset = loadPreset("illustrated-technical");

const sampleNodes: DiagramNode[] = [
  { id: "a", label: "Encoder", role: "encoder", shape: "rounded_rectangle" },
  { id: "b", label: "Decoder", role: "decoder", shape: "rounded_rectangle" },
];

const sampleConnections: DiagramConnection[] = [
  { from: "a", to: "b", style: "default" },
];

describe("buildDiagramScript", () => {
  it("produces JXA script with OmniGraffle activation", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain('Application("OmniGraffle")');
    expect(script).toContain("og.activate()");
  });

  it("uses evaluateJavascript for Omni Automation", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain("evaluateJavascript");
  });

  it("includes hexToRGB color helper in OmniJS code", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain("function hexToRGB(hex)");
    expect(script).toContain("Color.RGB");
  });

  it("embeds node data with resolved colors", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    // Encoder role resolves to primary color
    expect(script).toContain("#4A90D9");
    // Decoder role resolves to secondary color
    expect(script).toContain("#E87878");
  });

  it("embeds connection data", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain('"from":"a"');
    expect(script).toContain('"to":"b"');
  });

  it("passes layout type to OmniJS", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain('"layout":"auto_hierarchical"');
  });

  it("passes manual layout without calling canvas.layout()", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "manual",
      canvasType: "diagram",
      preset,
    });
    // Layout type is passed in the data payload
    expect(script).toContain('"layout":"manual"');
    // OmniJS code checks data.layout !== "manual" before calling layout()
    expect(script).toContain('data.layout !== \\"manual\\"');
  });

  it("safely encodes title with special characters", () => {
    const script = buildDiagramScript({
      title: 'Test "Quotes" & <Angles>',
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain('\\"Quotes\\"');
  });

  it("includes export when exportPath is set", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
      exportPath: "/tmp/test.png",
      exportFormat: "PNG",
    });
    expect(script).toContain("/tmp/test.png");
    expect(script).toContain('"PNG"');
  });
});
