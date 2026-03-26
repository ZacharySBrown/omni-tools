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
  it("produces a string containing OmniGraffle activation", () => {
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

  it("includes hex2color helper", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain("function hex2color(hex)");
  });

  it("embeds node data as JSON", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain('"id":"a"');
    expect(script).toContain('"label":"Encoder"');
    expect(script).toContain('"id":"b"');
  });

  it("embeds connection data as JSON", () => {
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

  it("uses diagram canvas dimensions for diagram type", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain("CANVAS_W = 1600");
    expect(script).toContain("CANVAS_H = 1200");
  });

  it("uses slide canvas dimensions for slide type", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "slide",
      preset,
    });
    expect(script).toContain("CANVAS_W = 1920");
    expect(script).toContain("CANVAS_H = 1080");
  });

  it("includes layout engine selection for auto layouts", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_force",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain("Force-directed");
  });

  it("skips layout for manual mode", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "manual",
      canvasType: "diagram",
      preset,
    });
    expect(script).toContain('LAYOUT !== "manual"');
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
    // JSON.stringify escapes quotes properly
    expect(script).toContain('\\"Quotes\\"');
  });
});
