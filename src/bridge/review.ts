import { runOmniJS } from "./execute.js";
import type { ReviewFinding } from "../types/review.js";

export interface ReadbackShape {
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

export interface ReadbackLine {
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
        const aArea = a.width * a.height;
        const bArea = b.width * b.height;
        // The smaller shape is the one to move
        const mover = aArea <= bArea ? nonContainers[i] : nonContainers[j];
        const stayer = aArea <= bArea ? nonContainers[j] : nonContainers[i];
        findings.push({
          checkId: "shape_overlap",
          severity: "warning",
          message: `"${nonContainers[i].name}" and "${nonContainers[j].name}" overlap by ${overlapX}×${overlapY}px`,
          shapeName: mover.name,
          details: {
            other: stayer.name,
            overlapX, overlapY,
            moverGeo: mover.geometry,
            stayerGeo: stayer.geometry,
          },
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

// ── Auto-fix implementations ────────────────────────────────────

export interface FixApplied {
  checkId: string;
  shapeName: string;
  description: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/**
 * Widen shapes that have text overflow findings.
 * Returns the list of fixes applied via OmniGraffle.
 */
export function fixTextOverflow(
  findings: ReviewFinding[],
): FixApplied[] {
  const overflowFindings = findings.filter(f => f.checkId === "text_overflow" && f.shapeName && f.details);
  if (overflowFindings.length === 0) return [];

  // Build resize commands: { shapeName, newWidth }
  const resizes = overflowFindings.map(f => ({
    shapeName: f.shapeName!,
    oldWidth: (f.details as Record<string, number>).shapeWidth,
    newWidth: Math.ceil((f.details as Record<string, number>).estWidth) + 16,
  }));

  const resizesJson = JSON.stringify(resizes);
  const omniCode = `(function() {
    var resizes = ${resizesJson};
    var canvas = document.windows[0].selection.canvas;
    if (!canvas) canvas = document.portfolio.canvases[0];
    var applied = [];
    for (var ri = 0; ri < resizes.length; ri++) {
      var r = resizes[ri];
      for (var i = 0; i < canvas.graphics.length; i++) {
        var g = canvas.graphics[i];
        if (g instanceof Shape && g.name === r.shapeName) {
          var geo = g.geometry;
          var oldW = Math.round(geo.width);
          geo.width = r.newWidth;
          g.geometry = geo;
          applied.push({ shapeName: r.shapeName, oldWidth: oldW, newWidth: r.newWidth });
          break;
        }
      }
    }
    return JSON.stringify(applied);
  })()`;

  const script = `
var og = Application("OmniGraffle");
og.evaluateJavascript(${JSON.stringify(omniCode)});
`;
  const result = runOmniJS(script);
  if (!result.success || !result.output) {
    return [];
  }

  const applied = JSON.parse(result.output) as Array<{ shapeName: string; oldWidth: number; newWidth: number }>;
  return applied.map(a => ({
    checkId: "text_overflow",
    shapeName: a.shapeName,
    description: `Widened shape from ${a.oldWidth}px to ${a.newWidth}px to fit text`,
    before: { width: a.oldWidth },
    after: { width: a.newWidth },
  }));
}

/**
 * Shift overlapping shapes apart. Moves the smaller shape away from the larger one
 * along the axis with the least overlap (smallest required movement).
 *
 * Detects "sandwiched" shapes by simulating the proposed shift and checking if it
 * would create a new collision with any other shape. Escalates instead of ping-ponging.
 */
export function fixShapeOverlap(
  findings: ReviewFinding[],
  allShapes: ReadbackShape[] = [],
): FixApplied[] {
  const overlapFindings = findings.filter(
    f => f.checkId === "shape_overlap" && f.shapeName && f.details?.moverGeo,
  );
  if (overlapFindings.length === 0) return [];

  const shiftMap = new Map<string, { dx: number; dy: number }>();
  const sandwiched: FixApplied[] = [];
  const padding = 8;

  for (const f of overlapFindings) {
    const d = f.details as Record<string, unknown>;
    const moverGeo = d.moverGeo as { x: number; y: number; width: number; height: number };
    const stayerGeo = d.stayerGeo as { x: number; y: number; width: number; height: number };
    const overlapX = d.overlapX as number;
    const overlapY = d.overlapY as number;
    const stayerName = d.other as string;

    let dx = 0;
    let dy = 0;

    if (overlapX <= overlapY) {
      const moverCenterX = moverGeo.x + moverGeo.width / 2;
      const stayerCenterX = stayerGeo.x + stayerGeo.width / 2;
      dx = moverCenterX < stayerCenterX ? -(overlapX + padding) : (overlapX + padding);
    } else {
      const moverCenterY = moverGeo.y + moverGeo.height / 2;
      const stayerCenterY = stayerGeo.y + stayerGeo.height / 2;
      dy = moverCenterY < stayerCenterY ? -(overlapY + padding) : (overlapY + padding);
    }

    // Simulate: would this shift create a new collision?
    const proposedGeo = {
      x: moverGeo.x + dx,
      y: moverGeo.y + dy,
      width: moverGeo.width,
      height: moverGeo.height,
    };

    const wouldCollide = allShapes.some(s => {
      if (s.name === f.shapeName || s.name === stayerName) return false;
      const area = s.geometry.width * s.geometry.height;
      if (area >= 200000) return false; // skip containers
      const ox = Math.max(0, Math.min(proposedGeo.x + proposedGeo.width, s.geometry.x + s.geometry.width) - Math.max(proposedGeo.x, s.geometry.x));
      const oy = Math.max(0, Math.min(proposedGeo.y + proposedGeo.height, s.geometry.y + s.geometry.height) - Math.max(proposedGeo.y, s.geometry.y));
      return ox > 5 && oy > 5;
    });

    if (wouldCollide) {
      sandwiched.push({
        checkId: "shape_overlap",
        shapeName: f.shapeName!,
        description: `Sandwiched between ${stayerName} and another shape — reposition in diagram spec`,
        before: {},
        after: {},
      });
      continue;
    }

    const existing = shiftMap.get(f.shapeName!);
    if (existing) {
      existing.dx += dx;
      existing.dy += dy;
    } else {
      shiftMap.set(f.shapeName!, { dx, dy });
    }
  }

  const shifts = Array.from(shiftMap.entries()).map(([shapeName, shift]) => ({
    shapeName,
    dx: shift.dx,
    dy: shift.dy,
  }));

  const shiftsJson = JSON.stringify(shifts);
  const omniCode = `(function() {
    var shifts = ${shiftsJson};
    var canvas = document.windows[0].selection.canvas;
    if (!canvas) canvas = document.portfolio.canvases[0];
    var applied = [];
    for (var si = 0; si < shifts.length; si++) {
      var s = shifts[si];
      for (var i = 0; i < canvas.graphics.length; i++) {
        var g = canvas.graphics[i];
        if (g instanceof Shape && g.name === s.shapeName) {
          var geo = g.geometry;
          var oldX = Math.round(geo.x);
          var oldY = Math.round(geo.y);
          geo.x = geo.x + s.dx;
          geo.y = geo.y + s.dy;
          g.geometry = geo;
          applied.push({
            shapeName: s.shapeName,
            oldX: oldX, oldY: oldY,
            newX: Math.round(geo.x), newY: Math.round(geo.y)
          });
          break;
        }
      }
    }
    return JSON.stringify(applied);
  })()`;

  const script = `
var og = Application("OmniGraffle");
og.evaluateJavascript(${JSON.stringify(omniCode)});
`;
  const result = runOmniJS(script);
  if (!result.success || !result.output) {
    return [];
  }

  const applied = JSON.parse(result.output) as Array<{
    shapeName: string; oldX: number; oldY: number; newX: number; newY: number;
  }>;
  const shifted = applied.map(a => ({
    checkId: "shape_overlap",
    shapeName: a.shapeName,
    description: `Shifted shape from (${a.oldX}, ${a.oldY}) to (${a.newX}, ${a.newY}) to resolve overlap`,
    before: { x: a.oldX, y: a.oldY },
    after: { x: a.newX, y: a.newY },
  }));
  return [...shifted, ...sandwiched];
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
