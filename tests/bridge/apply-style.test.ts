import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildApplyStyleScript } from "../../src/bridge/apply-style.js";
import { loadPreset } from "../../src/styles/loader.js";

process.env.DIAGRAMMER_PRESETS_DIR = path.join(process.cwd(), "presets");
const preset = loadPreset("illustrated-technical");

describe("buildApplyStyleScript", () => {
  it("produces script that activates OmniGraffle", () => {
    const script = buildApplyStyleScript({
      preset,
      scope: "current_canvas",
      remapByRole: true,
    });
    expect(script).toContain('Application("OmniGraffle")');
    expect(script).toContain("og.activate()");
  });

  it("uses frontmost doc when no path given", () => {
    const script = buildApplyStyleScript({
      preset,
      scope: "current_canvas",
      remapByRole: true,
    });
    expect(script).toContain("og.documents[0]");
  });

  it("opens specific doc when path given", () => {
    const script = buildApplyStyleScript({
      preset,
      documentPath: "/path/to/doc.graffle",
      scope: "all_canvases",
      remapByRole: true,
    });
    expect(script).toContain("og.open(Path");
    expect(script).toContain("/path/to/doc.graffle");
  });

  it("includes role keys for remapping", () => {
    const script = buildApplyStyleScript({
      preset,
      scope: "current_canvas",
      remapByRole: true,
    });
    expect(script).toContain("encoder");
    expect(script).toContain("decoder");
    expect(script).toContain("ROLE_KEYS");
  });

  it("includes hex2color helper", () => {
    const script = buildApplyStyleScript({
      preset,
      scope: "current_canvas",
      remapByRole: true,
    });
    expect(script).toContain("function hex2color");
  });

  it("iterates all canvases when scope is all_canvases", () => {
    const script = buildApplyStyleScript({
      preset,
      scope: "all_canvases",
      remapByRole: true,
    });
    expect(script).toContain('"all_canvases"');
  });
});
