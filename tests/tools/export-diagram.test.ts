import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/bridge/execute.js", () => ({
  runOmniJSFile: vi.fn().mockReturnValue({ success: true, output: "exported:/tmp/out.pdf" }),
}));

import { exportDiagramTool } from "../../src/tools/export-diagram.js";
import { runOmniJSFile } from "../../src/bridge/execute.js";

const mockRunOmniJSFile = vi.mocked(runOmniJSFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockRunOmniJSFile.mockReturnValue({ success: true, output: "exported:/tmp/out.pdf" });
});

describe("exportDiagramTool", () => {
  it("has correct name", () => {
    expect(exportDiagramTool.name).toBe("export_diagram");
  });

  it("exports frontmost doc to PDF", async () => {
    const result = await exportDiagramTool.execute({
      output_path: "/tmp/out.pdf",
      format: "pdf",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("/tmp/out.pdf");
    expect(result.content[0].text).toContain("PDF");
  });

  it("passes document_path to bridge when specified", async () => {
    await exportDiagramTool.execute({
      document_path: "/path/to/doc.graffle",
      output_path: "/tmp/out.svg",
      format: "svg",
    });
    const script = mockRunOmniJSFile.mock.calls[0][0];
    expect(script).toContain("/path/to/doc.graffle");
  });

  it("returns error on bridge failure", async () => {
    mockRunOmniJSFile.mockReturnValue({
      success: false,
      error: "No document open",
    });
    const result = await exportDiagramTool.execute({
      output_path: "/tmp/out.pdf",
      format: "pdf",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Export error");
  });

  it("rejects invalid format", async () => {
    await expect(
      exportDiagramTool.execute({
        output_path: "/tmp/out.bmp",
        format: "bmp",
      }),
    ).rejects.toThrow();
  });
});
