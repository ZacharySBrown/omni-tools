import { describe, it, expect } from "vitest";
import {
  NodeSchema,
  ConnectionSchema,
  CreateDiagramInputSchema,
  ExportDiagramInputSchema,
} from "../../src/types/diagram.js";

describe("NodeSchema", () => {
  it("accepts minimal node", () => {
    const result = NodeSchema.parse({ id: "n1", label: "Test" });
    expect(result.id).toBe("n1");
    expect(result.role).toBe("neutral");
    expect(result.shape).toBe("rounded_rectangle");
  });

  it("accepts fully specified node", () => {
    const result = NodeSchema.parse({
      id: "enc",
      label: "Encoder",
      role: "encoder",
      shape: "rectangle",
      color_override: "#FF0000",
      x: 100,
      y: 200,
      width: 160,
      height: 60,
      sublabel: "×6 layers",
    });
    expect(result.role).toBe("encoder");
    expect(result.color_override).toBe("#FF0000");
  });

  it("rejects node without id", () => {
    expect(() => NodeSchema.parse({ label: "No ID" })).toThrow();
  });

  it("rejects node without label", () => {
    expect(() => NodeSchema.parse({ id: "n1" })).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      NodeSchema.parse({ id: "n1", label: "Test", role: "invalid" })
    ).toThrow();
  });

  it("rejects invalid shape", () => {
    expect(() =>
      NodeSchema.parse({ id: "n1", label: "Test", shape: "hexagon" })
    ).toThrow();
  });
});

describe("ConnectionSchema", () => {
  it("accepts minimal connection", () => {
    const result = ConnectionSchema.parse({ from: "a", to: "b" });
    expect(result.style).toBe("default");
  });

  it("accepts connection with all fields", () => {
    const result = ConnectionSchema.parse({
      from: "a",
      to: "b",
      label: "data flow",
      style: "highlight",
      color_override: "#00FF00",
    });
    expect(result.label).toBe("data flow");
    expect(result.style).toBe("highlight");
  });

  it("rejects connection without from", () => {
    expect(() => ConnectionSchema.parse({ to: "b" })).toThrow();
  });

  it("rejects invalid style", () => {
    expect(() =>
      ConnectionSchema.parse({ from: "a", to: "b", style: "dotted" })
    ).toThrow();
  });
});

describe("CreateDiagramInputSchema", () => {
  const minimalDiagram = {
    title: "Test Diagram",
    nodes: [
      { id: "a", label: "Node A" },
      { id: "b", label: "Node B" },
    ],
    connections: [{ from: "a", to: "b" }],
  };

  it("accepts minimal diagram input", () => {
    const result = CreateDiagramInputSchema.parse(minimalDiagram);
    expect(result.layout).toBe("auto_hierarchical");
    expect(result.canvas_type).toBe("diagram");
    expect(result.style_preset).toBe("illustrated-technical");
  });

  it("accepts fully specified diagram input", () => {
    const result = CreateDiagramInputSchema.parse({
      ...minimalDiagram,
      description: "A test",
      layout: "auto_force",
      canvas_type: "slide",
      style_preset: "clean-academic",
      output_path: "~/Desktop/test.pdf",
      output_format: "pdf",
    });
    expect(result.layout).toBe("auto_force");
    expect(result.output_format).toBe("pdf");
  });

  it("rejects diagram without title", () => {
    const { title: _title, ...rest } = minimalDiagram;
    expect(() => CreateDiagramInputSchema.parse(rest)).toThrow();
  });

  it("rejects diagram without nodes", () => {
    const { nodes: _nodes, ...rest } = minimalDiagram;
    expect(() => CreateDiagramInputSchema.parse(rest)).toThrow();
  });

  it("rejects invalid layout type", () => {
    expect(() =>
      CreateDiagramInputSchema.parse({ ...minimalDiagram, layout: "grid" })
    ).toThrow();
  });
});

describe("ExportDiagramInputSchema", () => {
  it("accepts minimal export input", () => {
    const result = ExportDiagramInputSchema.parse({
      output_path: "/tmp/out.pdf",
      format: "pdf",
    });
    expect(result.dpi).toBe(144);
    expect(result.document_path).toBeUndefined();
  });

  it("accepts fully specified export input", () => {
    const result = ExportDiagramInputSchema.parse({
      document_path: "/path/to/doc.graffle",
      output_path: "/tmp/out.png",
      format: "png",
      canvas_name: "Diagram 1",
      dpi: 300,
    });
    expect(result.dpi).toBe(300);
    expect(result.canvas_name).toBe("Diagram 1");
  });

  it("rejects missing output_path", () => {
    expect(() =>
      ExportDiagramInputSchema.parse({ format: "pdf" })
    ).toThrow();
  });

  it("rejects invalid format", () => {
    expect(() =>
      ExportDiagramInputSchema.parse({
        output_path: "/tmp/out.bmp",
        format: "bmp",
      })
    ).toThrow();
  });
});
