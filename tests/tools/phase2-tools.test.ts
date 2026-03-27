import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import * as path from "path";

beforeAll(() => {
  process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");
});

vi.mock("../../src/bridge/execute.js", () => ({
  runOmniJSFile: vi.fn().mockReturnValue({ success: true, output: "applied:5 shapes updated" }),
}));

import { applyStylePresetTool } from "../../src/tools/apply-style-preset.js";
import { addElementTool } from "../../src/tools/add-element.js";
import { extractStyleTool } from "../../src/tools/extract-style.js";
import { runOmniJSFile } from "../../src/bridge/execute.js";

const mockRunOmniJSFile = vi.mocked(runOmniJSFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockRunOmniJSFile.mockReturnValue({ success: true, output: "applied:5 shapes updated" });
});

describe("applyStylePresetTool", () => {
  it("has correct name", () => {
    expect(applyStylePresetTool.name).toBe("apply_style_preset");
  });

  it("executes successfully", async () => {
    const result = await applyStylePresetTool.execute({
      preset_name: "illustrated-technical",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("illustrated-technical");
  });

  it("returns error on bridge failure", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: false, error: "No doc open" });
    const result = await applyStylePresetTool.execute({
      preset_name: "illustrated-technical",
    });
    expect(result.isError).toBe(true);
  });

  it("rejects invalid preset name", async () => {
    await expect(
      applyStylePresetTool.execute({ preset_name: "nonexistent" }),
    ).rejects.toThrow();
  });
});

describe("addElementTool", () => {
  beforeEach(() => {
    mockRunOmniJSFile.mockReturnValue({ success: true, output: "added:shape" });
  });

  it("has correct name", () => {
    expect(addElementTool.name).toBe("add_element");
  });

  it("adds a shape", async () => {
    const result = await addElementTool.execute({
      type: "shape",
      label: "Test Node",
      role: "encoder",
      x: 100,
      y: 200,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("encoder shape");
    expect(result.content[0].text).toContain("Test Node");
  });

  it("adds a line", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: true, output: "added:line" });
    const result = await addElementTool.execute({
      type: "line",
      x: 0,
      y: 0,
      connect_from_name: "a",
      connect_to_name: "b",
    });
    expect(result.content[0].text).toContain("line");
  });

  it("returns error on bridge failure", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: false, error: "Shape not found" });
    const result = await addElementTool.execute({
      type: "shape",
      x: 0,
      y: 0,
    });
    expect(result.isError).toBe(true);
  });
});

describe("extractStyleTool", () => {
  it("has correct name", () => {
    expect(extractStyleTool.name).toBe("extract_style_from_document");
  });

  it("returns error when no shapes found", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: true, output: "[]" });
    const result = await extractStyleTool.execute({
      output_preset_name: "test-extract",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("No shapes found");
  });

  it("returns error on bridge failure", async () => {
    mockRunOmniJSFile.mockReturnValue({ success: false, error: "No doc" });
    const result = await extractStyleTool.execute({
      output_preset_name: "test-extract",
    });
    expect(result.isError).toBe(true);
  });
});
