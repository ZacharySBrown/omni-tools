import type { StyleTokens } from "../types/styles.js";
import type { ElementType, SemanticRole } from "../types/diagram.js";

export interface BuildAddElementScriptOptions {
  type: ElementType;
  label?: string;
  role: SemanticRole;
  x: number;
  y: number;
  width?: number;
  height?: number;
  connectFromName?: string;
  connectToName?: string;
  preset: StyleTokens;
}

// Canvas-fit snippet: measure all graphics, expand canvas to fit with padding.
// Injected into each OmniJS function so the canvas always contains all content.
const CANVAS_FIT_SNIPPET = `
  var allG = canvas.graphics;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var fi = 0; fi < allG.length; fi++) {
    var geo = allG[fi].geometry;
    if (geo.x < minX) minX = geo.x;
    if (geo.y < minY) minY = geo.y;
    if (geo.x + geo.width > maxX) maxX = geo.x + geo.width;
    if (geo.y + geo.height > maxY) maxY = geo.y + geo.height;
  }
  var fitPad = 60;
  var needW = (maxX - minX) + fitPad * 2;
  var needH = (maxY - minY) + fitPad * 2;
  var curW = canvas.size.width;
  var curH = canvas.size.height;
  if (needW > curW || needH > curH) {
    canvas.size = new Size(Math.max(needW, curW), Math.max(needH, curH));
  }
`;

/**
 * Build a JXA script that adds a single element to the frontmost
 * OmniGraffle canvas using evaluateJavascript (Omni Automation),
 * matching the pattern used by create_diagram.
 */
export function buildAddElementScript(opts: BuildAddElementScriptOptions): string {
  const { type, label, role, x, y, width, height, connectFromName, connectToName, preset } = opts;

  if (type === "line") {
    return buildLineScript(connectFromName, connectToName, label, preset);
  }

  if (type === "text_annotation") {
    return buildAnnotationScript(label, x, y, preset);
  }

  // shape
  const w = width ?? preset.shapes.min_node_width;
  const h = height ?? preset.shapes.min_node_height;

  const roleMap = preset.semantic_roles as Record<string, string>;
  const colorKey = roleMap[role] ?? "surface";
  const colors = preset.colors as Record<string, string>;
  const fillHex = colors[colorKey] ?? preset.colors.surface;
  const darkRoles = ["encoder", "decoder", "attention", "output"];
  const textHex = darkRoles.includes(role)
    ? preset.colors.text_on_primary
    : preset.colors.text_primary;

  const payload = JSON.stringify({
    label: label ?? "",
    role,
    x, y, w, h,
    fillHex,
    textHex,
    strokeWidth: preset.shapes.stroke_width_default,
    cornerRadius: preset.shapes.node_corner_radius,
    textSize: preset.typography.sizes.md,
    font: preset.typography.label_font,
  });

  const omniFunc = `function(data) {
  var canvas = document.windows[0].selection.canvas;
  if (!canvas) canvas = document.portfolio.canvases[0];

  function hexToRGB(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, 1);
  }

  var shape = canvas.addShape("RoundedRectangle", new Rect(data.x, data.y, data.w, data.h));
  shape.fillColor = hexToRGB(data.fillHex);
  shape.strokeColor = hexToRGB(data.fillHex);
  shape.strokeThickness = data.strokeWidth;
  shape.cornerRadius = data.cornerRadius;
  shape.shadowColor = null;
  shape.textColor = hexToRGB(data.textHex);
  shape.textSize = data.textSize;
  shape.fontName = data.font;
  shape.textHorizontalAlignment = HorizontalTextAlignment.Center;
  shape.textVerticalPlacement = VerticalTextPlacement.Middle;
  shape.textHorizontalPadding = 16;
  shape.textVerticalPadding = 12;
  shape.text = data.label;
  shape.name = data.label;
  shape.setUserData("role", data.role);
  shape.magnets = [new Point(0, -0.5), new Point(0, 0.5), new Point(-0.5, 0), new Point(0.5, 0)];

  ${CANVAS_FIT_SNIPPET}

  return "added:shape:" + data.label;
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.3);

var data = ${payload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");
result;
`;
}

function buildLineScript(
  fromName: string | undefined,
  toName: string | undefined,
  label: string | undefined,
  preset: StyleTokens,
): string {
  const payload = JSON.stringify({
    fromName: fromName ?? "",
    toName: toName ?? "",
    label: label ?? "",
    connectorColor: preset.colors.connector,
    strokeWidth: preset.connectors.default_width,
    arrowStyle: preset.connectors.arrow_style,
    labelSize: preset.connectors.label_font_size,
    font: preset.typography.label_font,
  });

  const omniFunc = `function(data) {
  var canvas = document.windows[0].selection.canvas;
  if (!canvas) canvas = document.portfolio.canvases[0];

  function hexToRGB(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, 1);
  }

  var src = null, dst = null;
  var graphics = canvas.graphics;
  for (var i = 0; i < graphics.length; i++) {
    if (graphics[i].name === data.fromName) src = graphics[i];
    if (graphics[i].name === data.toName) dst = graphics[i];
  }
  if (!src) return "error:source_not_found:" + data.fromName;
  if (!dst) return "error:dest_not_found:" + data.toName;

  var line = canvas.connect(src, dst);
  line.strokeColor = hexToRGB(data.connectorColor);
  line.strokeThickness = data.strokeWidth;
  line.headType = data.arrowStyle;
  line.tailType = "";
  line.shadowColor = null;

  if (data.label) {
    line.text = data.label;
    line.fontName = data.font;
    line.textSize = data.labelSize;
    line.textColor = hexToRGB(data.connectorColor);
  }

  ${CANVAS_FIT_SNIPPET}

  return "added:line:" + data.fromName + "->" + data.toName;
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.3);

var data = ${payload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");
result;
`;
}

function buildAnnotationScript(
  label: string | undefined,
  x: number,
  y: number,
  preset: StyleTokens,
): string {
  const payload = JSON.stringify({
    label: label ?? "",
    x, y,
    textColor: preset.colors.text_secondary,
    textSize: preset.typography.sizes.sm,
    font: preset.typography.body_font,
  });

  const omniFunc = `function(data) {
  var canvas = document.windows[0].selection.canvas;
  if (!canvas) canvas = document.portfolio.canvases[0];

  function hexToRGB(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, 1);
  }

  var shape = canvas.addShape("Rectangle", new Rect(data.x, data.y, 200, 30));
  shape.fillColor = Color.RGB(0, 0, 0, 0);
  shape.strokeThickness = 0;
  shape.shadowColor = null;
  shape.text = data.label;
  shape.textColor = hexToRGB(data.textColor);
  shape.textSize = data.textSize;
  shape.fontName = data.font;

  ${CANVAS_FIT_SNIPPET}

  return "added:annotation:" + data.label;
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.3);

var data = ${payload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");
result;
`;
}
