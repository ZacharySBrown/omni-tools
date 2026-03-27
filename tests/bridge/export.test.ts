import { describe, it, expect } from "vitest";
import { buildExportScript } from "../../src/bridge/export.js";

describe("buildExportScript", () => {
  it("produces script for PDF export of frontmost doc", () => {
    const script = buildExportScript({
      outputPath: "/tmp/out.pdf",
      format: "pdf",
      dpi: 144,
    });
    expect(script).toContain("og.documents[0]");
    expect(script).toContain('"PDF"');
    expect(script).toContain("/tmp/out.pdf");
  });

  it("opens specified document when path given", () => {
    const script = buildExportScript({
      documentPath: "/path/to/doc.graffle",
      outputPath: "/tmp/out.svg",
      format: "svg",
      dpi: 144,
    });
    expect(script).toContain("og.open(Path");
    expect(script).toContain("/path/to/doc.graffle");
    expect(script).toContain('"SVG"');
  });

  it("produces correct format string for PNG", () => {
    const script = buildExportScript({
      outputPath: "/tmp/out.png",
      format: "png",
      dpi: 300,
    });
    expect(script).toContain('"PNG"');
  });

  it("produces correct format string for TIFF", () => {
    const script = buildExportScript({
      outputPath: "/tmp/out.tiff",
      format: "tiff",
      dpi: 144,
    });
    expect(script).toContain('"TIFF"');
  });

  it("includes canvas selection when canvas_name given", () => {
    const script = buildExportScript({
      outputPath: "/tmp/out.pdf",
      format: "pdf",
      canvasName: "Diagram 1",
      dpi: 144,
    });
    expect(script).toContain("Diagram 1");
    expect(script).toContain("targetCanvas");
  });

  it("does not include canvas selection when no canvas_name", () => {
    const script = buildExportScript({
      outputPath: "/tmp/out.pdf",
      format: "pdf",
      dpi: 144,
    });
    expect(script).not.toContain("targetCanvas");
  });
});
