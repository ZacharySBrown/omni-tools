import type { StyleTokens } from "../types/styles.js";
import { JXA_HELPERS } from "./jxa-helpers.js";

export interface BuildApplyStyleScriptOptions {
  preset: StyleTokens;
  documentPath?: string;
  scope: "all_canvases" | "current_canvas";
  remapByRole: boolean;
}

export function buildApplyStyleScript(opts: BuildApplyStyleScriptOptions): string {
  const { preset, documentPath, scope, remapByRole } = opts;
  const presetJson = JSON.stringify(preset);
  const roleKeys = JSON.stringify(Object.keys(preset.semantic_roles));

  return `
var og = Application("OmniGraffle");
og.activate();

var PRESET = ${presetJson};
var ROLE_KEYS = ${roleKeys};
var SCOPE = ${JSON.stringify(scope)};
var REMAP_BY_ROLE = ${remapByRole};

${JXA_HELPERS}

var doc = ${documentPath ? `og.open(Path(${JSON.stringify(documentPath)}))` : "og.documents[0]"};
if (!doc) throw new Error("No OmniGraffle document is open");

var canvases;
if (SCOPE === "all_canvases") {
  canvases = doc.canvases();
} else {
  canvases = [doc.canvases[doc.canvases.length > 0 ? 0 : -1]];
}

var updated = 0;

for (var ci = 0; ci < canvases.length; ci++) {
  var canvas = canvases[ci];
  var graphics = canvas.graphics();

  for (var gi = 0; gi < graphics.length; gi++) {
    var g = graphics[gi];
    var shapeName = g.name();

    // Apply role-based coloring if name matches a role key
    if (REMAP_BY_ROLE && shapeName && ROLE_KEYS.indexOf(shapeName) >= 0) {
      var fill = roleToFillHex(shapeName, PRESET);
      var textColor = roleToTextHex(shapeName, PRESET);
      g.fillColor = hex2color(fill);
      g.strokeColor = hex2color(fill);
      g.textColor = hex2color(textColor);
    }

    // Apply typography and stroke to all shapes
    g.textSize = PRESET.typography.sizes.md;
    g.font = PRESET.typography.label_font;
    g.strokeThickness = PRESET.shapes.stroke_width_default;

    updated++;
  }
}

"applied:" + updated + " shapes updated";
`;
}
