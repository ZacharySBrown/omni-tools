import type { StyleTokens } from "../types/styles.js";

export interface BuildApplyStyleScriptOptions {
  preset: StyleTokens;
  documentPath?: string;
  scope: "all_canvases" | "current_canvas";
  remapByRole: boolean;
}

/**
 * Build a JXA script that applies a style preset to existing shapes
 * via evaluateJavascript (Omni Automation).
 */
export function buildApplyStyleScript(opts: BuildApplyStyleScriptOptions): string {
  const { preset, documentPath, scope, remapByRole } = opts;

  const payload = JSON.stringify({
    scope,
    remapByRole,
    roleKeys: Object.keys(preset.semantic_roles),
    roles: preset.semantic_roles,
    colors: preset.colors,
    darkRoles: ["encoder", "decoder", "attention", "output"],
    textSize: preset.typography.sizes.md,
    font: preset.typography.label_font,
    strokeWidth: preset.shapes.stroke_width_default,
    background: preset.colors.background,
  });

  const omniFunc = `function(data) {
  function hexToRGB(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, 1);
  }

  function darkenHex(hex, factor) {
    var r = Math.round(parseInt(hex.slice(1,3), 16) * factor);
    var g = Math.round(parseInt(hex.slice(3,5), 16) * factor);
    var b = Math.round(parseInt(hex.slice(5,7), 16) * factor);
    return Color.RGB(r/255, g/255, b/255, 1);
  }

  var canvases;
  if (data.scope === "all_canvases") {
    canvases = document.portfolio.canvases;
  } else {
    var canvas = (document.windows.length > 0 && document.windows[0].selection)
      ? document.windows[0].selection.canvas
      : null;
    if (!canvas) canvas = document.portfolio.canvases[0];
    canvases = [canvas];
  }

  var updated = 0;

  for (var ci = 0; ci < canvases.length; ci++) {
    var canvas = canvases[ci];
    canvas.background.fillColor = hexToRGB(data.background);
    var graphics = canvas.graphics;

    for (var gi = 0; gi < graphics.length; gi++) {
      var g = graphics[gi];

      // Skip lines/connectors — only restyle shapes
      if (typeof g.shape !== "string") continue;

      // Read semantic role from userData (set during create_diagram / add_element)
      var ud = g.userData; var shapeRole = ud ? ud["role"] : null;

      // Apply role-based coloring if shape has a role
      if (data.remapByRole && shapeRole) {
        var roleColorKey = data.roles[shapeRole];
        if (roleColorKey) {
          var fillHex = data.colors[roleColorKey] || data.colors.surface;
          g.fillColor = hexToRGB(fillHex);
          g.strokeColor = darkenHex(fillHex, 0.75);
          var textHex = (data.darkRoles.indexOf(shapeRole) >= 0)
            ? data.colors.text_on_primary
            : data.colors.text_primary;
          g.textColor = hexToRGB(textHex);
        }
      }

      // Apply typography and stroke to all shapes
      g.textSize = data.textSize;
      g.fontName = data.font;
      g.strokeThickness = data.strokeWidth;

      updated++;
    }
  }

  return "applied:" + updated + " shapes updated";
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.3);
${documentPath ? `og.open(Path(${JSON.stringify(documentPath)}));\ndelay(0.5);` : ""}

var data = ${payload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");
result;
`;
}
