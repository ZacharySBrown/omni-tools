import { describe, it, expect, vi } from "vitest";

// Mock the review module to avoid OmniGraffle dependency
vi.mock("../../src/bridge/review.js", () => ({
  readDiagramState: vi.fn(),
}));

import { extractDiagramSpec } from "../../src/bridge/extract-spec.js";
import { readDiagramState } from "../../src/bridge/review.js";

const mockReadback = {
  document: { name: "Test Diagram" },
  canvases: [{
    name: "Canvas 1",
    size: { width: 800, height: 600 },
    shapes: [
      {
        id: "1",
        name: "encoder_block",
        text: "Feed Forward\nNetwork",
        geometry: { x: 100, y: 50, width: 200, height: 80 },
        style: { fillColor: "#C4DAFC", strokeColor: "#8BADD4", strokeThickness: 1.5, cornerRadius: 12 },
        textStyle: { fontName: "Helvetica Neue", textSize: 18, textColor: "#2D3748" },
      },
      {
        id: "2",
        name: "attn_block",
        text: "Multi-Head\nAttention",
        geometry: { x: 100, y: 200, width: 200, height: 80 },
        style: { fillColor: "#FDECC8", strokeColor: "#D4A853", strokeThickness: 1.5, cornerRadius: 12 },
        textStyle: { fontName: "Helvetica Neue", textSize: 18, textColor: "#2D3748" },
      },
      {
        id: "3",
        name: "stage_label",
        text: "Stage 1",
        geometry: { x: 50, y: 70, width: 80, height: 30 },
        style: { fillColor: null, strokeColor: null, strokeThickness: 0, cornerRadius: 0 },
        textStyle: { fontName: "Helvetica Neue", textSize: 14, textColor: "#2D3748" },
      },
      {
        id: "4",
        name: "note",
        text: "Important detail",
        geometry: { x: 400, y: 100, width: 150, height: 40 },
        style: { fillColor: null, strokeColor: null, strokeThickness: 0, cornerRadius: 0 },
        textStyle: { fontName: "Helvetica Neue", textSize: 13, textColor: "#C53030" },
      },
    ],
    lines: [
      {
        id: "10",
        source: "encoder_block",
        destination: "attn_block",
        text: "",
        geometry: { x: 200, y: 130, width: 1, height: 70 },
        style: { strokeColor: "#4A5568", strokeThickness: 1.5, lineType: "0" },
      },
    ],
  }],
};

describe("extractDiagramSpec", () => {
  it("extracts title from document name", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    expect(spec.title).toBe("Test Diagram");
  });

  it("always uses manual layout", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    expect(spec.layout).toBe("manual");
  });

  it("maps shapes to nodes with correct geometry", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    const enc = spec.nodes.find(n => n.id === "encoder_block");
    expect(enc).toBeDefined();
    expect(enc!.x).toBe(100);
    expect(enc!.y).toBe(50);
    expect(enc!.width).toBe(200);
    expect(enc!.height).toBe(80);
  });

  it("splits text into label and sublabel", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    const enc = spec.nodes.find(n => n.id === "encoder_block");
    expect(enc!.label).toBe("Feed Forward");
    expect(enc!.sublabel).toBe("Network");
  });

  it("infers role from fill color", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    const enc = spec.nodes.find(n => n.id === "encoder_block");
    const attn = spec.nodes.find(n => n.id === "attn_block");
    expect(enc!.role).toBe("encoder");
    expect(attn!.role).toBe("attention");
  });

  it("detects annotation shapes from zero stroke", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    const label = spec.nodes.find(n => n.id === "stage_label");
    expect(label!.shape).toBe("annotation");
    expect(label!.opacity).toBe(0);
  });

  it("preserves non-default text colors", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    const note = spec.nodes.find(n => n.id === "note");
    expect(note!.text_color).toBe("#C53030");
  });

  it("does not include text_color for default color", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    const enc = spec.nodes.find(n => n.id === "encoder_block");
    expect(enc!.text_color).toBeUndefined();
  });

  it("extracts connections from lines", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    expect(spec.connections).toHaveLength(1);
    expect(spec.connections[0].from).toBe("encoder_block");
    expect(spec.connections[0].to).toBe("attn_block");
    expect(spec.connections[0].line_type).toBe("straight");
  });

  it("omits label on connections with empty text", () => {
    vi.mocked(readDiagramState).mockReturnValue(mockReadback);
    const spec = extractDiagramSpec();
    expect(spec.connections[0].label).toBeUndefined();
  });

  it("throws when no canvas found", () => {
    vi.mocked(readDiagramState).mockReturnValue({
      document: { name: "Empty" },
      canvases: [],
    });
    expect(() => extractDiagramSpec()).toThrow("No canvas found");
  });
});
