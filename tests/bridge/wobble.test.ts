import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildDiagramScript } from "../../src/bridge/diagram.js";
import { loadPreset } from "../../src/styles/loader.js";
import { applyXkcdTransform } from "../../src/styles/xkcd-transform.js";
import type { DiagramNode, DiagramConnection } from "../../src/types/diagram.js";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

const basePreset = loadPreset("illustrated-technical");
const xkcdPreset = applyXkcdTransform(basePreset);

const sampleNodes: DiagramNode[] = [
  { id: "a", label: "Encoder", role: "encoder", shape: "rounded_rectangle" },
  { id: "b", label: "Decoder", role: "decoder", shape: "rounded_rectangle" },
];

const sampleConnections: DiagramConnection[] = [
  { from: "a", to: "b", style: "default" },
];

describe("buildDiagramScript with hand_drawn enabled", () => {
  it("includes wobble helper functions when hand_drawn is enabled", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain("function wobbleRect");
    expect(script).toContain("function wobbleEllipse");
    expect(script).toContain("function wobbleDiamond");
    expect(script).toContain("function wobbleConnectorPoints");
    expect(script).toContain("function mulberry32");
  });

  it("does not include wobble helpers for non-hand-drawn presets", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: basePreset,
    });
    expect(script).not.toContain("function wobbleRect");
    expect(script).not.toContain("function mulberry32");
  });

  it("sets HAND_DRAWN flag to true for xkcd preset", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain("HAND_DRAWN = true");
  });

  it("sets HAND_DRAWN flag to false for normal preset", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: basePreset,
    });
    expect(script).toContain("HAND_DRAWN = false");
  });

  it("uses drawWobblyShape for nodes in hand-drawn mode", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain("drawWobblyShape");
  });

  it("uses wobbleConnectorPoints for connections in hand-drawn mode", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain("wobbleConnectorPoints");
  });

  it("forces curved line type in hand-drawn mode", () => {
    const script = buildDiagramScript({
      title: "Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain('HAND_DRAWN ? "curved"');
  });

  it("handles circle shapes in hand-drawn mode", () => {
    const circleNodes: DiagramNode[] = [
      { id: "c", label: "Circle", role: "neutral", shape: "circle" },
    ];
    const script = buildDiagramScript({
      title: "Test",
      nodes: circleNodes,
      connections: [],
      layout: "manual",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain("drawWobblyShape");
  });

  it("handles diamond shapes in hand-drawn mode", () => {
    const diamondNodes: DiagramNode[] = [
      { id: "d", label: "Diamond", role: "neutral", shape: "diamond" },
    ];
    const script = buildDiagramScript({
      title: "Test",
      nodes: diamondNodes,
      connections: [],
      layout: "manual",
      canvasType: "diagram",
      preset: xkcdPreset,
    });
    expect(script).toContain("drawWobblyShape");
  });
});

describe("buildDiagramScript with xkcd.json preset directly", () => {
  it("loads xkcd preset and generates wobble script", () => {
    const xkcdDirect = loadPreset("xkcd");
    const script = buildDiagramScript({
      title: "XKCD Test",
      nodes: sampleNodes,
      connections: sampleConnections,
      layout: "auto_hierarchical",
      canvasType: "diagram",
      preset: xkcdDirect,
    });
    expect(script).toContain("HAND_DRAWN = true");
    expect(script).toContain("function wobbleRect");
  });
});
