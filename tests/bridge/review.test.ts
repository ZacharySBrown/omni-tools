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
