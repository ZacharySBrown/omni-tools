import type { StyleTokens } from "../types/styles.js";
import type { ElementType, SemanticRole } from "../types/diagram.js";
import { JXA_HELPERS } from "./jxa-helpers.js";

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

export function buildAddElementScript(opts: BuildAddElementScriptOptions): string {
  const { type, label, role, x, y, width, height, connectFromName, connectToName, preset } = opts;
  const presetJson = JSON.stringify(preset);

  if (type === "line") {
    return buildLineScript(connectFromName, connectToName, label, preset);
  }

  if (type === "text_annotation") {
    return buildAnnotationScript(label, x, y, preset);
  }

  // shape
  const w = width ?? preset.shapes.min_node_width;
  const h = height ?? preset.shapes.min_node_height;

  return `
var og = Application("OmniGraffle");
og.activate();

var PRESET = ${presetJson};

${JXA_HELPERS}

var doc = og.documents[0];
if (!doc) throw new Error("No OmniGraffle document is open");
var canvas = doc.canvases[0];

var fill = roleToFillHex(${JSON.stringify(role)}, PRESET);
var textColor = roleToTextHex(${JSON.stringify(role)}, PRESET);

var s = og.Shape({ within: canvas });
s.geometry = { x: ${x}, y: ${y}, width: ${w}, height: ${h} };
s.shape = "Rectangle";
s.fillColor = hex2color(fill);
s.strokeColor = hex2color(fill);
s.strokeThickness = PRESET.shapes.stroke_width_default;
s.cornerRadius = PRESET.shapes.node_corner_radius;
s.textColor = hex2color(textColor);
s.textSize = PRESET.typography.sizes.md;
s.font = PRESET.typography.label_font;
s.textHorizontalAlignment = "center";
s.textVerticalPlacement = "middle";
${label ? `s.text = ${JSON.stringify(label)};\ns.name = ${JSON.stringify(label)};` : ""}

"added:shape";
`;
}

function buildLineScript(
  fromName: string | undefined,
  toName: string | undefined,
  label: string | undefined,
  preset: StyleTokens,
): string {
  const presetJson = JSON.stringify(preset);

  return `
var og = Application("OmniGraffle");
og.activate();

var PRESET = ${presetJson};

${JXA_HELPERS}

var doc = og.documents[0];
if (!doc) throw new Error("No OmniGraffle document is open");
var canvas = doc.canvases[0];
var graphics = canvas.graphics();

var src = null;
var dst = null;
for (var i = 0; i < graphics.length; i++) {
  var name = graphics[i].name();
  if (name === ${JSON.stringify(fromName ?? "")}) src = graphics[i];
  if (name === ${JSON.stringify(toName ?? "")}) dst = graphics[i];
}

if (!src) throw new Error("Source shape not found: ${fromName}");
if (!dst) throw new Error("Destination shape not found: ${toName}");

var line = og.Line({ within: canvas });
line.source = src;
line.destination = dst;
line.strokeColor = hex2color(PRESET.colors.connector);
line.strokeThickness = PRESET.connectors.default_width;
line.headType = PRESET.connectors.arrow_style;
line.tailType = "";
line.lineType = PRESET.connectors.routing;
${label ? `line.text = ${JSON.stringify(label)};\nline.textSize = PRESET.connectors.label_font_size;` : ""}

"added:line";
`;
}

function buildAnnotationScript(
  label: string | undefined,
  x: number,
  y: number,
  preset: StyleTokens,
): string {
  const presetJson = JSON.stringify(preset);

  return `
var og = Application("OmniGraffle");
og.activate();

var PRESET = ${presetJson};

${JXA_HELPERS}

var doc = og.documents[0];
if (!doc) throw new Error("No OmniGraffle document is open");
var canvas = doc.canvases[0];

var s = og.Shape({ within: canvas });
s.geometry = { x: ${x}, y: ${y}, width: 200, height: 30 };
s.shape = "Rectangle";
s.fillColor = hex2color("#00000000");
s.strokeThickness = 0;
s.text = ${JSON.stringify(label ?? "")};
s.textColor = hex2color(PRESET.colors.text_secondary);
s.textSize = PRESET.typography.sizes.sm;
s.font = PRESET.typography.body_font;

"added:text_annotation";
`;
}
