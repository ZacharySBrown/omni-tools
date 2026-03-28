import { describe, it, expect } from "vitest";
import { buildExtractStyleScript } from "../../src/bridge/extract-style.js";

describe("buildExtractStyleScript", () => {
  it("produces script that samples shape properties", () => {
    const script = buildExtractStyleScript({});
    expect(script).toContain('Application("OmniGraffle")');
    expect(script).toContain("samples");
    expect(script).toContain("fillColor");
    expect(script).toContain("strokeColor");
    expect(script).toContain("font");
    expect(script).toContain("cornerRadius");
  });

  it("uses evaluateJavascript with document.portfolio when no path given", () => {
    const script = buildExtractStyleScript({});
    expect(script).toContain("evaluateJavascript");
    expect(script).toContain("document.portfolio.canvases");
  });

  it("opens specific doc when path given", () => {
    const script = buildExtractStyleScript({
      documentPath: "/path/to/slides.graffle",
    });
    expect(script).toContain("og.open(Path");
    expect(script).toContain("/path/to/slides.graffle");
  });

  it("returns JSON.stringify of samples", () => {
    const script = buildExtractStyleScript({});
    expect(script).toContain("JSON.stringify(samples)");
  });

  it("iterates all canvases", () => {
    const script = buildExtractStyleScript({});
    expect(script).toContain("document.portfolio.canvases");
    expect(script).toContain("canvases.length");
  });
});
