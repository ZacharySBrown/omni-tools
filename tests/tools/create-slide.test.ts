import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

vi.mock("../../src/bridge/execute.js", () => ({
  runOmniJSFile: vi.fn().mockReturnValue({ success: true, output: "slide:Slide 1|nodes:3|conns:2|annotations:0" }),
}));

import { createSlideTool } from "../../src/tools/create-slide.js";
import { runOmniJSFile } from "../../src/bridge/execute.js";

const mockRunOmniJSFile = vi.mocked(runOmniJSFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockRunOmniJSFile.mockReturnValue({ success: true, output: "slide:Slide 1|nodes:3|conns:2|annotations:0" });
});

const validInput = {
  title: "Test Presentation",
  base_diagram: {
    nodes: [
      { id: "a", label: "Input", role: "input" },
      { id: "b", label: "Process", role: "encoder" },
      { id: "c", label: "Output", role: "output" },
    ],
    connections: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
  },
  slides: [
    { title: "Overview" },
    {
      title: "Focus on Process",
      highlight_nodes: ["b"],
      dim_nodes: ["a", "c"],
      annotations: [{ text: "Core logic here", anchor_node: "b", style: "callout" }],
    },
  ],
};

describe("createSlideTool", () => {
  it("has correct name", () => {
    expect(createSlideTool.name).toBe("create_slide");
  });

  it("renders first slide by default", async () => {
    const result = await createSlideTool.execute(validInput);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Overview");
    expect(mockRunOmniJSFile).toHaveBeenCalledTimes(1);
  });

  it("renders specified slide_index", async () => {
    const result = await createSlideTool.execute({ ...validInput, slide_index: 1 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Focus on Process");
  });

  it("includes visible node count in response", async () => {
    const result = await createSlideTool.execute({ ...validInput, slide_index: 1 });
    // All 3 nodes are visible (highlighted or dimmed, not hidden)
    expect(result.content[0].text).toContain("3 visible nodes");
    expect(result.content[0].text).toContain("1 annotations");
  });

  it("returns error for out-of-range slide_index", async () => {
    const result = await createSlideTool.execute({ ...validInput, slide_index: 5 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid slide_index");
  });

  it("calls bridge with JXA script containing state data", async () => {
    await createSlideTool.execute({ ...validInput, slide_index: 1 });
    const script = mockRunOmniJSFile.mock.calls[0][0];
    expect(script).toContain("OmniGraffle");
    expect(script).toContain('"state":"highlighted"');
    expect(script).toContain('"state":"dimmed"');
  });

  it("returns error when bridge fails", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: false, error: "OmniGraffle crashed" });
    const result = await createSlideTool.execute(validInput);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("OmniGraffle error");
  });

  it("auto-exports when output_path and format provided", async () => {
    const result = await createSlideTool.execute({
      ...validInput,
      output_path: "/tmp/slide.png",
      output_format: "png",
    });
    expect(mockRunOmniJSFile).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toContain("exported");
  });

  it("reports export failure separately", async () => {
    mockRunOmniJSFile
      .mockReturnValueOnce({ success: true, output: "slide:ok" })
      .mockReturnValueOnce({ success: false, error: "export failed" });
    const result = await createSlideTool.execute({
      ...validInput,
      output_path: "/tmp/slide.png",
      output_format: "png",
    });
    expect(result.content[0].text).toContain("export failed");
  });

  it("rejects invalid input", async () => {
    await expect(createSlideTool.execute({})).rejects.toThrow();
  });

  it("rejects input with no slides", async () => {
    await expect(
      createSlideTool.execute({ ...validInput, slides: [] }),
    ).rejects.toThrow();
  });
});
