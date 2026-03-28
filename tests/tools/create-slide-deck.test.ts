import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");

vi.mock("../../src/bridge/execute.js", () => ({
  runOmniJSFile: vi.fn().mockReturnValue({ success: true, output: "deck:Test|slides:3|layers:3" }),
}));

import { createSlideDeckTool } from "../../src/tools/create-slide-deck.js";
import { runOmniJSFile } from "../../src/bridge/execute.js";

const mockRunOmniJSFile = vi.mocked(runOmniJSFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockRunOmniJSFile.mockReturnValue({ success: true, output: "deck:Test|slides:3|layers:3" });
});

const validInput = {
  title: "Test Deck",
  base_diagram: {
    nodes: [
      { id: "a", label: "Step 1", role: "input" },
      { id: "b", label: "Step 2", role: "encoder" },
    ],
    connections: [{ from: "a", to: "b" }],
  },
  slides: [
    { title: "Slide 1" },
    { title: "Slide 2", highlight_nodes: ["b"], dim_nodes: ["a"] },
    { title: "Slide 3", highlight_nodes: ["a"], dim_nodes: ["b"] },
  ],
};

describe("createSlideDeckTool", () => {
  it("has correct name", () => {
    expect(createSlideDeckTool.name).toBe("create_slide_deck");
  });

  it("renders all slides in one document", async () => {
    const result = await createSlideDeckTool.execute(validInput);
    expect(result.isError).toBeUndefined();
    // One call for the entire deck (not one per slide)
    expect(mockRunOmniJSFile).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toContain("3 layers");
  });

  it("passes all slide data in single script", async () => {
    await createSlideDeckTool.execute(validInput);
    const script = mockRunOmniJSFile.mock.calls[0][0];
    expect(script).toContain('"title":"Slide 1"');
    expect(script).toContain('"title":"Slide 2"');
    expect(script).toContain('"title":"Slide 3"');
    expect(script).toContain("newLayer");
  });

  it("includes export info when output_path provided", async () => {
    const result = await createSlideDeckTool.execute({
      ...validInput,
      output_path: "/tmp/deck",
      output_format: "png",
    });
    expect(result.content[0].text).toContain("Exported");
    expect(result.content[0].text).toContain("slide-01.png");
  });

  it("returns error when bridge fails", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: false, error: "crash" });
    const result = await createSlideDeckTool.execute(validInput);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("OmniGraffle error");
  });

  it("rejects invalid input", async () => {
    await expect(createSlideDeckTool.execute({})).rejects.toThrow();
  });

  it("uses extended timeout for deck rendering", async () => {
    await createSlideDeckTool.execute(validInput);
    expect(mockRunOmniJSFile).toHaveBeenCalledWith(expect.any(String), 120000);
  });
});
