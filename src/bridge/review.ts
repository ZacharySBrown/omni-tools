import { runOmniJS } from "./execute.js";
import type { ReviewFinding } from "../types/review.js";

interface ReadbackShape {
  id: string;
  name: string;
  text: string;
  geometry: { x: number; y: number; width: number; height: number };
  style: {
    fillColor: string | null;
    strokeColor: string | null;
    strokeThickness: number;
    cornerRadius: number;
  };
  textStyle: {
    fontName: string;
    textSize: number;
    textColor: string | null;
  };
}

interface ReadbackLine {
  id: string;
  source: string | null;
  destination: string | null;
  text: string;
  geometry: { x: number; y: number; width: number; height: number };
  style: {
    strokeColor: string | null;
    strokeThickness: number;
    lineType: string;
  };
}

interface ReadbackCanvas {
  name: string;
  size: { width: number; height: number };
  shapes: ReadbackShape[];
  lines: ReadbackLine[];
}

export interface DiagramReadback {
  document: { name: string };
  canvases: ReadbackCanvas[];
}

/**
 * Read the frontmost OmniGraffle document's state via evaluateJavascript.
 */
export function readDiagramState(): DiagramReadback {
  const omniCode = `(function() {
    function colorToHex(c) {
      if (!c) return null;
      try {
        var r = Math.round(c.red * 255);
        var g = Math.round(c.green * 255);
        var b = Math.round(c.blue * 255);
        var hex = "#";
        hex += (r < 16 ? "0" : "") + r.toString(16);
        hex += (g < 16 ? "0" : "") + g.toString(16);
        hex += (b < 16 ? "0" : "") + b.toString(16);
        return hex.toUpperCase();
      } catch(e) { return null; }
    }
    var result = { document: { name: document.name }, canvases: [] };
    for (var ci = 0; ci < document.portfolio.canvases.length; ci++) {
      var canvas = document.portfolio.canvases[ci];
      var canvasData = {
        name: canvas.name,
        size: { width: canvas.size.width, height: canvas.size.height },
        shapes: [],
        lines: []
      };
      for (var i = 0; i < canvas.graphics.length; i++) {
        var g = canvas.graphics[i];
        var geo = g.geometry;
        if (g instanceof Line) {
          canvasData.lines.push({
            id: "" + g.id,
            source: g.head ? (g.head.name || "") : null,
            destination: g.tail ? (g.tail.name || "") : null,
            text: "" + (g.text || ""),
            geometry: { x: Math.round(geo.x), y: Math.round(geo.y),
              width: Math.round(geo.width), height: Math.round(geo.height) },
            style: { strokeColor: colorToHex(g.strokeColor),
              strokeThickness: g.strokeThickness,
              lineType: "" + g.lineType }
          });
        } else if (g instanceof Shape) {
          canvasData.shapes.push({
            id: "" + g.id,
            name: g.name || "",
            text: "" + (g.text || ""),
            geometry: { x: Math.round(geo.x), y: Math.round(geo.y),
              width: Math.round(geo.width), height: Math.round(geo.height) },
            style: { fillColor: colorToHex(g.fillColor),
              strokeColor: colorToHex(g.strokeColor),
              strokeThickness: g.strokeThickness,
              cornerRadius: g.cornerRadius },
            textStyle: { fontName: g.fontName,
              textSize: g.textSize,
              textColor: colorToHex(g.textColor) }
          });
        }
      }
      result.canvases.push(canvasData);
    }
    return JSON.stringify(result);
  })()`;

  const script = `
var og = Application("OmniGraffle");
og.evaluateJavascript(${JSON.stringify(omniCode)});
`;
  const result = runOmniJS(script);
  if (!result.success || !result.output) {
    throw new Error(`Readback failed: ${result.error ?? "no output"}`);
  }
  return JSON.parse(result.output) as DiagramReadback;
}

// ── Automated check implementations ────────────────────────────

export function checkTextOverflow(
  shapes: ReadbackShape[],
  charWidthFactor = 0.6,
  hPadding = 32,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const s of shapes) {
    if (!s.text || s.text === "undefined") continue;
    const lines = s.text.split("\n");
    const longestLine = Math.max(...lines.map(l => l.length));
    const estWidth = longestLine * s.textStyle.textSize * charWidthFactor + hPadding;
    if (estWidth > s.geometry.width) {
      findings.push({
        checkId: "text_overflow",
        severity: "error",
        message: `Text "${s.text}" likely overflows shape (est ${Math.round(estWidth)}px > ${s.geometry.width}px width)`,
        shapeName: s.name,
        shapeText: s.text,
        details: { estWidth: Math.round(estWidth), shapeWidth: s.geometry.width },
      });
    }
  }
  return findings;
}

export function checkTextTooSmall(
  shapes: ReadbackShape[],
  minFillRatio = 0.3,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const s of shapes) {
    if (!s.text || s.text === "undefined" || s.text === "") continue;
    // Skip wide shapes (width > 3x height) — they're intentionally large containers
    if (s.geometry.width > s.geometry.height * 3) continue;
    const longestLine = Math.max(...s.text.split("\n").map(l => l.length));
    const estWidth = longestLine * s.textStyle.textSize * 0.6;
    const fillRatio = estWidth / s.geometry.width;
    if (fillRatio < minFillRatio && s.geometry.width > 100) {
      findings.push({
        checkId: "text_too_small",
        severity: "warning",
        message: `Text "${s.text}" fills only ${Math.round(fillRatio * 100)}% of shape width — consider larger font`,
        shapeName: s.name,
        shapeText: s.text,
        details: { fillRatio: Math.round(fillRatio * 100), shapeWidth: s.geometry.width },
      });
    }
  }
  return findings;
}

export function checkShapeOverlap(
  shapes: ReadbackShape[],
  minOverlapPx = 5,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  // Skip containers (large shapes that intentionally overlap children)
  const nonContainers = shapes.filter(s => {
    const area = s.geometry.width * s.geometry.height;
    return area < 200000; // skip very large shapes (borders)
  });

  for (let i = 0; i < nonContainers.length; i++) {
    for (let j = i + 1; j < nonContainers.length; j++) {
      const a = nonContainers[i].geometry;
      const b = nonContainers[j].geometry;
      const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      if (overlapX > minOverlapPx && overlapY > minOverlapPx) {
        findings.push({
          checkId: "shape_overlap",
          severity: "warning",
          message: `"${nonContainers[i].name}" and "${nonContainers[j].name}" overlap by ${overlapX}×${overlapY}px`,
          shapeName: nonContainers[i].name,
          details: { other: nonContainers[j].name, overlapX, overlapY },
        });
      }
    }
  }
  return findings;
}

export function checkInconsistentSizing(
  shapes: ReadbackShape[],
  tolerancePx = 2,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const groups = groupByPrefix(shapes);

  for (const [prefix, group] of Object.entries(groups)) {
    if (group.length < 2) continue;
    const refW = group[0].geometry.width;
    const refH = group[0].geometry.height;
    for (const s of group.slice(1)) {
      if (Math.abs(s.geometry.width - refW) > tolerancePx ||
          Math.abs(s.geometry.height - refH) > tolerancePx) {
        findings.push({
          checkId: "inconsistent_sizing",
          severity: "warning",
          message: `"${s.name}" (${s.geometry.width}×${s.geometry.height}) differs from group "${prefix}" baseline (${refW}×${refH})`,
          shapeName: s.name,
          details: { prefix, expected: { w: refW, h: refH }, actual: { w: s.geometry.width, h: s.geometry.height } },
        });
      }
    }
  }
  return findings;
}

export function checkInconsistentFontSize(
  shapes: ReadbackShape[],
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const groups = groupByPrefix(shapes);

  for (const [prefix, group] of Object.entries(groups)) {
    if (group.length < 2) continue;
    const withText = group.filter(s => s.text && s.text !== "undefined" && s.text !== "");
    if (withText.length < 2) continue;
    const refSize = withText[0].textStyle.textSize;
    for (const s of withText.slice(1)) {
      if (s.textStyle.textSize !== refSize) {
        findings.push({
          checkId: "inconsistent_font_size",
          severity: "warning",
          message: `"${s.name}" uses ${s.textStyle.textSize}px but group "${prefix}" baseline is ${refSize}px`,
          shapeName: s.name,
          details: { prefix, expected: refSize, actual: s.textStyle.textSize },
        });
      }
    }
  }
  return findings;
}

export function checkThinStrokes(
  shapes: ReadbackShape[],
  minStrokePx = 1.0,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const s of shapes) {
    if (s.style.strokeThickness > 0 && s.style.strokeThickness < minStrokePx) {
      findings.push({
        checkId: "thin_strokes",
        severity: "info",
        message: `"${s.name}" has stroke ${s.style.strokeThickness}px (< ${minStrokePx}px minimum)`,
        shapeName: s.name,
        details: { strokeThickness: s.style.strokeThickness },
      });
    }
  }
  return findings;
}

export function checkTextContrast(
  shapes: ReadbackShape[],
  minLuminanceDiff = 0.3,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const s of shapes) {
    if (!s.text || s.text === "undefined" || s.text === "") continue;
    if (!s.style.fillColor || !s.textStyle.textColor) continue;
    // Skip transparent annotations — their fill is invisible so contrast doesn't apply
    if (s.style.strokeThickness === 0) continue;
    const fillLum = relativeLuminance(s.style.fillColor);
    const textLum = relativeLuminance(s.textStyle.textColor);
    const diff = Math.abs(fillLum - textLum);
    if (diff < minLuminanceDiff) {
      findings.push({
        checkId: "text_contrast",
        severity: "error",
        message: `"${s.name}" has low text contrast (${Math.round(diff * 100)}% luminance diff)`,
        shapeName: s.name,
        shapeText: s.text,
        details: { fillColor: s.style.fillColor, textColor: s.textStyle.textColor, luminanceDiff: Math.round(diff * 100) },
      });
    }
  }
  return findings;
}

// ── Helpers ─────────────────────────────────────────────────────

function groupByPrefix(shapes: ReadbackShape[]): Record<string, ReadbackShape[]> {
  const groups: Record<string, ReadbackShape[]> = {};
  for (const s of shapes) {
    if (!s.name) continue;
    const match = s.name.match(/^(.+?)_?\d+$/);
    const prefix = match ? match[1] : s.name;
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(s);
  }
  return groups;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
