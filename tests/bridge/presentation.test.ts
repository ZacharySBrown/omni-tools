import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildSlideScript, buildDeckScript } from "../../src/bridge/presentation.js";
import { loadPreset } from "../../src/styles/loader.js";
import type { ResolvedSlide, ResolvedNode, ResolvedConnection } from "../../src/presentation/resolver.js";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

const preset = loadPreset("illustrated-technical");

function makeSlide(overrides: Partial<ResolvedSlide> = {}): ResolvedSlide {
  return {
    title: "Test Slide",
    canvas_name: "Slide 1",
    nodes: [
      { id: "a", label: "Input", role: "input", shape: "rounded_rectangle", state: "normal" },
      { id: "b", label: "Process", role: "encoder", shape: "rounded_rectangle", state: "normal" },
      { id: "c", label: "Output", role: "output", shape: "rounded_rectangle", state: "normal" },
    ] as ResolvedNode[],
    connections: [
      { from: "a", to: "b", style: "default", state: "normal" },
      { from: "b", to: "c", style: "default", state: "normal" },
    ] as ResolvedConnection[],
    annotations: [],
    layout: "manual",
    preset,
    ...overrides,
  };
}

describe("buildSlideScript", () => {
  it("produces JXA script with OmniGraffle activation", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).toContain('Application("OmniGraffle")');
    expect(script).toContain("evaluateJavascript");
  });

  it("includes color helpers and shape map", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).toContain("function hexToRGB(hex)");
    expect(script).toContain("function hexToRGBA(hex");
    expect(script).toContain("ogShapeMap");
  });

  it("embeds node data with resolved colors", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).toContain(preset.colors.primary);
    expect(script).toContain('"id":"a"');
    expect(script).toContain('"id":"b"');
  });

  it("excludes hidden nodes from payload", () => {
    const slide = makeSlide({
      nodes: [
        { id: "a", label: "Visible", role: "input", shape: "rounded_rectangle", state: "normal" } as ResolvedNode,
        { id: "b", label: "Hidden", role: "encoder", shape: "rounded_rectangle", state: "hidden" } as ResolvedNode,
      ],
    });
    const script = buildSlideScript({ slide });
    expect(script).toContain('"id":"a"');
    expect(script).not.toContain('"id":"b"');
  });

  it("excludes hidden connections from payload", () => {
    const slide = makeSlide({
      connections: [
        { from: "a", to: "b", style: "default", state: "normal" } as ResolvedConnection,
        { from: "b", to: "c", style: "default", state: "hidden" } as ResolvedConnection,
      ],
    });
    const script = buildSlideScript({ slide });
    expect(script).toContain('"from":"a"');
    expect(script).not.toContain('"from":"b"');
  });

  it("includes state field for dimmed nodes", () => {
    const slide = makeSlide({
      nodes: [{ id: "a", label: "Dimmed", role: "input", shape: "rounded_rectangle", state: "dimmed" } as ResolvedNode],
    });
    const script = buildSlideScript({ slide });
    expect(script).toContain('"state":"dimmed"');
    expect(script).toContain("dimOpacity");
  });

  it("includes state field for highlighted nodes", () => {
    const slide = makeSlide({
      nodes: [{ id: "a", label: "HL", role: "encoder", shape: "rounded_rectangle", state: "highlighted" } as ResolvedNode],
    });
    const script = buildSlideScript({ slide });
    expect(script).toContain('"state":"highlighted"');
    expect(script).toContain("highlightStroke");
  });

  it("renders annotations", () => {
    const slide = makeSlide({
      annotations: [{ text: "Callout text", x: 300, y: 100, style: "callout" }],
    });
    const script = buildSlideScript({ slide });
    expect(script).toContain("Callout text");
  });

  it("includes export script when exportPath provided", () => {
    const script = buildSlideScript({ slide: makeSlide(), exportPath: "/tmp/test.png", exportFormat: "PNG" });
    expect(script).toContain("/tmp/test.png");
  });

  it("includes canvas fit logic", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).toContain("fitPad");
  });

  it("does NOT contain canvas.layout() (async bug regression)", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).not.toContain("canvas.layout()");
  });

  it("includes setUserData calls for role metadata", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).toMatch(/setUserData\(.*role/);
  });

  it("includes doSyncLayout function definition", () => {
    const script = buildSlideScript({ slide: makeSlide() });
    expect(script).toContain("function doSyncLayout(");
    expect(script).toContain("doSyncLayout(data.nodes, data.conns, shapes, S, data.layout)");
  });

  it("runs sync layout with auto_hierarchical layout", () => {
    const slide = makeSlide({ layout: "auto_hierarchical" });
    const script = buildSlideScript({ slide });
    expect(script).toContain('"layout":"auto_hierarchical"');
    expect(script).toContain("doSyncLayout(");
  });
});

describe("buildDeckScript", () => {
  const twoSlides = [
    makeSlide({ title: "Overview", canvas_name: "Slide 1" }),
    makeSlide({
      title: "Focus",
      canvas_name: "Slide 2",
      nodes: [
        { id: "a", label: "Input", role: "input", shape: "rounded_rectangle", state: "highlighted" } as ResolvedNode,
        { id: "b", label: "Process", role: "encoder", shape: "rounded_rectangle", state: "dimmed" } as ResolvedNode,
      ],
    }),
  ];

  it("produces JXA script that creates one document", () => {
    const script = buildDeckScript({ title: "Test Deck", slides: twoSlides });
    expect(script).toContain('Application("OmniGraffle")');
    // Only one Document().make()
    const makeCount = (script.match(/Document\(\)\.make\(\)/g) || []).length;
    expect(makeCount).toBe(1);
  });

  it("embeds all slides in payload", () => {
    const script = buildDeckScript({ title: "Test Deck", slides: twoSlides });
    expect(script).toContain('"title":"Overview"');
    expect(script).toContain('"title":"Focus"');
  });

  it("uses newLayer for multiple slides", () => {
    const script = buildDeckScript({ title: "Test Deck", slides: twoSlides });
    expect(script).toContain("newLayer");
  });

  it("includes layer visibility toggling for export", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides, exportDir: "/tmp/deck", exportFormat: "PNG" });
    expect(script).toContain("slide-");
    expect(script).toContain("/tmp/deck");
    expect(script).toContain("visible");
  });

  it("omits export when no exportDir", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides });
    expect(script).not.toContain("doShellScript");
  });

  it("includes different states per slide", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides });
    expect(script).toContain('"state":"highlighted"');
    expect(script).toContain('"state":"dimmed"');
    expect(script).toContain('"state":"normal"');
  });

  it("does NOT contain canvas.layout() (async bug regression)", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides });
    expect(script).not.toContain("canvas.layout()");
  });

  it("includes per-layer doSyncLayout call", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides });
    expect(script).toContain("function doSyncLayout(");
    expect(script).toContain("doSyncLayout(slideData.nodes, slideData.conns, shapes, S, slideData.layout)");
  });

  it("includes setUserData for role and state", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides });
    expect(script).toMatch(/setUserData\(.*role/);
    expect(script).toMatch(/setUserData\(.*state/);
  });

  it("assigns connections to their layer (#35 regression)", () => {
    const script = buildDeckScript({ title: "Deck", slides: twoSlides });
    expect(script).toContain("line.layer = layer");
  });
});
