import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

// Mock the bridge execution — we don't want to actually call osascript in tests
vi.mock("../../src/bridge/execute.js", () => ({
  runOmniJSFile: vi.fn().mockReturnValue({ success: true, output: "done" }),
}));

import { createDiagramTool } from "../../src/tools/create-diagram.js";
import { runOmniJSFile } from "../../src/bridge/execute.js";

const mockRunOmniJSFile = vi.mocked(runOmniJSFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockRunOmniJSFile.mockReturnValue({ success: true, output: "done" });
});

const validInput = {
  title: "Test Diagram",
  nodes: [
    { id: "a", label: "Node A", role: "encoder" },
    { id: "b", label: "Node B", role: "decoder" },
  ],
  connections: [{ from: "a", to: "b" }],
};

describe("createDiagramTool", () => {
  it("has correct name", () => {
    expect(createDiagramTool.name).toBe("create_diagram");
  });

  it("executes successfully with valid input", async () => {
    const result = await createDiagramTool.execute(validInput);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Test Diagram");
    expect(result.content[0].text).toContain("2 nodes");
    expect(result.content[0].text).toContain("1 connections");
  });

  it("calls bridge with generated JXA script", async () => {
    await createDiagramTool.execute(validInput);
    expect(mockRunOmniJSFile).toHaveBeenCalledTimes(1);
    const script = mockRunOmniJSFile.mock.calls[0][0];
    expect(script).toContain("OmniGraffle");
    expect(script).toContain("Node A");
  });

  it("returns error when bridge fails", async () => {
    mockRunOmniJSFile.mockReturnValue({
      success: false,
      error: "OmniGraffle not found",
    });
    const result = await createDiagramTool.execute(validInput);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("OmniGraffle error");
  });

  it("auto-exports when output_path and format provided", async () => {
    const result = await createDiagramTool.execute({
      ...validInput,
      output_path: "/tmp/test.pdf",
      output_format: "pdf",
    });
    // Two calls: create diagram + export
    expect(mockRunOmniJSFile).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toContain("exported");
  });

  it("rejects invalid input", async () => {
    await expect(createDiagramTool.execute({})).rejects.toThrow();
  });

  it("rejects input with invalid role", async () => {
    await expect(
      createDiagramTool.execute({
        ...validInput,
        nodes: [{ id: "x", label: "X", role: "invalid_role" }],
      }),
    ).rejects.toThrow();
  });
});
