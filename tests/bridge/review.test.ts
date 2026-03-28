import { describe, it, expect } from "vitest";
import {
  checkTextOverflow,
  checkTextTooSmall,
  checkShapeOverlap,
  checkInconsistentSizing,
  checkInconsistentFontSize,
  checkThinStrokes,
  checkTextContrast,
} from "../../src/bridge/review.js";

function makeShape(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    name: "test_shape",
    text: "Hello",
    geometry: { x: 100, y: 100, width: 200, height: 60 },
    style: {
      fillColor: "#C4DAFC",
      strokeColor: "#8BADD4",
      strokeThickness: 1.5,
      cornerRadius: 12,
    },
    textStyle: {
      fontName: "Helvetica Neue",
      textSize: 20,
      textColor: "#2D3748",
    },
    ...overrides,
  };
}

describe("checkTextOverflow", () => {
  it("passes when text fits in shape", () => {
    const shape = makeShape({ text: "Hello", geometry: { x: 0, y: 0, width: 200, height: 60 } });
    const findings = checkTextOverflow([shape]);
    expect(findings).toHaveLength(0);
  });

  it("flags text that overflows narrow shape", () => {
    const shape = makeShape({ text: "Very Long Label Text", geometry: { x: 0, y: 0, width: 80, height: 30 } });
    const findings = checkTextOverflow([shape]);
    expect(findings).toHaveLength(1);
    expect(findings[0].checkId).toBe("text_overflow");
    expect(findings[0].severity).toBe("error");
  });

  it("skips shapes with no text", () => {
    const shape = makeShape({ text: "" });
    const findings = checkTextOverflow([shape]);
    expect(findings).toHaveLength(0);
  });

  it("skips shapes with undefined text", () => {
    const shape = makeShape({ text: "undefined" });
    const findings = checkTextOverflow([shape]);
    expect(findings).toHaveLength(0);
  });
});

describe("checkTextTooSmall", () => {
  it("passes when text fills shape adequately", () => {
    const shape = makeShape({ text: "Feed Forward", geometry: { x: 0, y: 0, width: 200, height: 60 } });
    const findings = checkTextTooSmall([shape]);
    expect(findings).toHaveLength(0);
  });

  it("flags text that is tiny relative to a large shape", () => {
    const shape = makeShape({
      text: "Hi",
      geometry: { x: 0, y: 0, width: 300, height: 200 },
      textStyle: { fontName: "Helvetica", textSize: 12, textColor: "#000000" },
    });
    const findings = checkTextTooSmall([shape]);
    expect(findings).toHaveLength(1);
    expect(findings[0].checkId).toBe("text_too_small");
  });

  it("skips small shapes", () => {
    const shape = makeShape({ text: "x", geometry: { x: 0, y: 0, width: 30, height: 30 } });
    const findings = checkTextTooSmall([shape]);
    expect(findings).toHaveLength(0);
  });
});

describe("checkShapeOverlap", () => {
  it("passes when shapes don't overlap", () => {
    const s1 = makeShape({ name: "a", geometry: { x: 0, y: 0, width: 100, height: 50 } });
    const s2 = makeShape({ name: "b", geometry: { x: 200, y: 0, width: 100, height: 50 } });
    const findings = checkShapeOverlap([s1, s2]);
    expect(findings).toHaveLength(0);
  });

  it("flags overlapping shapes", () => {
    const s1 = makeShape({ name: "a", geometry: { x: 0, y: 0, width: 100, height: 50 } });
    const s2 = makeShape({ name: "b", geometry: { x: 50, y: 10, width: 100, height: 50 } });
    const findings = checkShapeOverlap([s1, s2]);
    expect(findings).toHaveLength(1);
    expect(findings[0].checkId).toBe("shape_overlap");
  });

  it("ignores large container shapes", () => {
    const container = makeShape({ name: "border", geometry: { x: 0, y: 0, width: 1000, height: 500 } });
    const child = makeShape({ name: "child", geometry: { x: 50, y: 50, width: 100, height: 50 } });
    const findings = checkShapeOverlap([container, child]);
    expect(findings).toHaveLength(0);
  });
});

describe("checkInconsistentSizing", () => {
  it("passes when same-prefix shapes have same size", () => {
    const s1 = makeShape({ name: "enc_1", geometry: { x: 0, y: 0, width: 160, height: 38 } });
    const s2 = makeShape({ name: "enc_2", geometry: { x: 0, y: 50, width: 160, height: 38 } });
    const findings = checkInconsistentSizing([s1, s2]);
    expect(findings).toHaveLength(0);
  });

  it("flags mismatched sizes within a group", () => {
    const s1 = makeShape({ name: "enc_1", geometry: { x: 0, y: 0, width: 160, height: 38 } });
    const s2 = makeShape({ name: "enc_2", geometry: { x: 0, y: 50, width: 180, height: 45 } });
    const findings = checkInconsistentSizing([s1, s2]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].checkId).toBe("inconsistent_sizing");
  });
});

describe("checkInconsistentFontSize", () => {
  it("passes when same-prefix shapes use same font size", () => {
    const s1 = makeShape({ name: "enc_1", text: "ENCODER", textStyle: { fontName: "H", textSize: 13, textColor: "#000" } });
    const s2 = makeShape({ name: "enc_2", text: "ENCODER", textStyle: { fontName: "H", textSize: 13, textColor: "#000" } });
    const findings = checkInconsistentFontSize([s1, s2]);
    expect(findings).toHaveLength(0);
  });

  it("flags different font sizes within a group", () => {
    const s1 = makeShape({ name: "enc_1", text: "ENCODER", textStyle: { fontName: "H", textSize: 13, textColor: "#000" } });
    const s2 = makeShape({ name: "enc_2", text: "ENCODER", textStyle: { fontName: "H", textSize: 18, textColor: "#000" } });
    const findings = checkInconsistentFontSize([s1, s2]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].checkId).toBe("inconsistent_font_size");
  });
});

describe("checkThinStrokes", () => {
  it("passes when stroke meets minimum", () => {
    const shape = makeShape({ style: { fillColor: "#FFF", strokeColor: "#000", strokeThickness: 1.5, cornerRadius: 0 } });
    const findings = checkThinStrokes([shape]);
    expect(findings).toHaveLength(0);
  });

  it("flags strokes below minimum", () => {
    const shape = makeShape({ style: { fillColor: "#FFF", strokeColor: "#000", strokeThickness: 0.5, cornerRadius: 0 } });
    const findings = checkThinStrokes([shape]);
    expect(findings).toHaveLength(1);
    expect(findings[0].checkId).toBe("thin_strokes");
  });
});

describe("fixTextOverflow integration", () => {
  it("checkTextOverflow findings contain data needed for fixTextOverflow", () => {
    const shape = makeShape({
      name: "base_lm",
      text: "AutoModelForCausalLM",
      geometry: { x: 0, y: 0, width: 120, height: 60 },
      textStyle: { fontName: "Helvetica", textSize: 20, textColor: "#000" },
    });
    const findings = checkTextOverflow([shape]);
    expect(findings).toHaveLength(1);
    expect(findings[0].shapeName).toBe("base_lm");
    expect(findings[0].details).toBeDefined();
    expect(findings[0].details!.estWidth).toBeGreaterThan(120);
    expect(findings[0].details!.shapeWidth).toBe(120);
  });

  it("findings for multi-line text use longest line for width estimate", () => {
    const shape = makeShape({
      name: "sft_box",
      text: "SFT\nSFTTrainer",
      geometry: { x: 0, y: 0, width: 100, height: 80 },
      textStyle: { fontName: "Helvetica", textSize: 20, textColor: "#000" },
    });
    const findings = checkTextOverflow([shape]);
    expect(findings).toHaveLength(1);
    // Longest line is "SFTTrainer" (10 chars), not "SFT" (3 chars)
    const estWidth = findings[0].details!.estWidth as number;
    const expectedForLongest = 10 * 20 * 0.6 + 32; // 152
    expect(estWidth).toBe(expectedForLongest);
  });
});

describe("checkShapeOverlap with fix data", () => {
  it("findings identify the smaller shape as the mover", () => {
    const small = makeShape({ name: "label", geometry: { x: 90, y: 10, width: 60, height: 30 } });
    const big = makeShape({ name: "box", geometry: { x: 100, y: 0, width: 200, height: 80 } });
    const findings = checkShapeOverlap([small, big]);
    expect(findings).toHaveLength(1);
    expect(findings[0].shapeName).toBe("label");
    expect(findings[0].details!.other).toBe("box");
    expect(findings[0].details!.moverGeo).toBeDefined();
    expect(findings[0].details!.stayerGeo).toBeDefined();
  });

  it("includes overlap dimensions for fix calculation", () => {
    const s1 = makeShape({ name: "a", geometry: { x: 0, y: 0, width: 100, height: 50 } });
    const s2 = makeShape({ name: "b", geometry: { x: 80, y: 10, width: 100, height: 50 } });
    const findings = checkShapeOverlap([s1, s2]);
    expect(findings[0].details!.overlapX).toBe(20);
    expect(findings[0].details!.overlapY).toBe(40);
  });

  it("detects sandwiched shape overlapping neighbors on both sides", () => {
    // Label sandwiched between left-box and right-box on x-axis
    const left = makeShape({ name: "left_box", geometry: { x: 0, y: 0, width: 120, height: 80 } });
    const label = makeShape({ name: "label", geometry: { x: 100, y: 20, width: 80, height: 30 } });
    const right = makeShape({ name: "right_box", geometry: { x: 150, y: 0, width: 120, height: 80 } });
    const findings = checkShapeOverlap([left, label, right]);
    // Label should overlap both boxes
    const labelFindings = findings.filter(f => f.shapeName === "label");
    expect(labelFindings).toHaveLength(2);
    // One neighbor is to the left, one to the right — opposite directions
    const others = labelFindings.map(f => f.details!.other);
    expect(others).toContain("left_box");
    expect(others).toContain("right_box");
  });
});

describe("checkTextContrast", () => {
  it("passes with good contrast (dark text on light bg)", () => {
    const shape = makeShape({
      text: "Hello",
      style: { fillColor: "#C4DAFC", strokeColor: "#000", strokeThickness: 1, cornerRadius: 0 },
      textStyle: { fontName: "H", textSize: 20, textColor: "#2D3748" },
    });
    const findings = checkTextContrast([shape]);
    expect(findings).toHaveLength(0);
  });

  it("flags low contrast (light text on light bg)", () => {
    const shape = makeShape({
      text: "Hello",
      style: { fillColor: "#E8F0FE", strokeColor: "#000", strokeThickness: 1, cornerRadius: 0 },
      textStyle: { fontName: "H", textSize: 20, textColor: "#D0D8E8" },
    });
    const findings = checkTextContrast([shape]);
    expect(findings).toHaveLength(1);
    expect(findings[0].checkId).toBe("text_contrast");
    expect(findings[0].severity).toBe("error");
  });
});
