export interface BuildExtractStyleScriptOptions {
  documentPath?: string;
}

/**
 * Build a JXA script that extracts style samples from all shapes
 * in the frontmost OmniGraffle document via evaluateJavascript.
 */
export function buildExtractStyleScript(opts: BuildExtractStyleScriptOptions): string {
  const { documentPath } = opts;

  const omniFunc = `function() {
  var canvases = document.portfolio.canvases;
  var samples = [];

  for (var ci = 0; ci < canvases.length; ci++) {
    var canvas = canvases[ci];
    var graphics = canvas.graphics;

    for (var gi = 0; gi < graphics.length; gi++) {
      var g = graphics[gi];

      // Skip lines/connectors — only process shapes
      if (typeof g.shape !== "string") continue;

      try {
        var fill = g.fillColor;
        var stroke = g.strokeColor;
        var textCol = g.textColor;

        samples.push({
          fillR: fill.red || 0,
          fillG: fill.green || 0,
          fillB: fill.blue || 0,
          strokeR: stroke.red || 0,
          strokeG: stroke.green || 0,
          strokeB: stroke.blue || 0,
          textR: textCol ? textCol.red || 0 : 0,
          textG: textCol ? textCol.green || 0 : 0,
          textB: textCol ? textCol.blue || 0 : 0,
          font: g.fontName || "",
          textSize: g.textSize || 0,
          strokeWidth: g.strokeThickness || 0,
          cornerRadius: g.cornerRadius || 0,
          width: g.geometry.width || 0,
          height: g.geometry.height || 0,
          name: g.name || "",
        });
      } catch(e) {
        // Skip shapes that error on property access
      }
    }
  }

  return JSON.stringify(samples);
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.3);
${documentPath ? `og.open(Path(${JSON.stringify(documentPath)}));\ndelay(0.5);` : ""}

var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")()");
result;
`;
}
