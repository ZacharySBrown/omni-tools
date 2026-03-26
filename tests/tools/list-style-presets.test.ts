import { describe, it, expect, beforeAll } from "vitest";
import * as path from "path";
import { listStylePresetsTool } from "../../src/tools/list-style-presets.js";

beforeAll(() => {
  process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");
});

describe("listStylePresetsTool", () => {
  it("has correct name", () => {
    expect(listStylePresetsTool.name).toBe("list_style_presets");
  });

  it("lists available presets", async () => {
    const result = await listStylePresetsTool.execute({});
    expect(result.content[0].text).toContain("illustrated-technical");
    expect(result.content[0].text).toContain("clean-academic");
  });

  it("includes descriptions", async () => {
    const result = await listStylePresetsTool.execute({});
    expect(result.content[0].text).toContain("Jay Alammar");
    expect(result.content[0].text).toContain("PyData");
  });
});
