export interface BuildExtractStyleScriptOptions {
  documentPath?: string;
}

export function buildExtractStyleScript(opts: BuildExtractStyleScriptOptions): string {
  const { documentPath } = opts;

  return `
var og = Application("OmniGraffle");
og.activate();

var doc = ${documentPath ? `og.open(Path(${JSON.stringify(documentPath)}))` : "og.documents[0]"};
if (!doc) throw new Error("No OmniGraffle document is open");

var samples = [];

var canvases = doc.canvases();
for (var ci = 0; ci < canvases.length; ci++) {
  var canvas = canvases[ci];
  var graphics = canvas.graphics();

  for (var gi = 0; gi < graphics.length; gi++) {
    var g = graphics[gi];

    try {
      var fill = g.fillColor();
      var stroke = g.strokeColor();
      var textCol = g.textColor ? g.textColor() : null;

      samples.push({
        fillR: fill.red ? fill.red() : 0,
        fillG: fill.green ? fill.green() : 0,
        fillB: fill.blue ? fill.blue() : 0,
        strokeR: stroke.red ? stroke.red() : 0,
        strokeG: stroke.green ? stroke.green() : 0,
        strokeB: stroke.blue ? stroke.blue() : 0,
        textR: textCol && textCol.red ? textCol.red() : 0,
        textG: textCol && textCol.green ? textCol.green() : 0,
        textB: textCol && textCol.blue ? textCol.blue() : 0,
        font: g.font ? g.font() : "",
        textSize: g.textSize ? g.textSize() : 0,
        strokeWidth: g.strokeThickness ? g.strokeThickness() : 0,
        cornerRadius: g.cornerRadius ? g.cornerRadius() : 0,
        width: g.geometry ? g.geometry().width : 0,
        height: g.geometry ? g.geometry().height : 0,
        name: g.name ? g.name() : "",
      });
    } catch(e) {
      // Skip shapes that error on property access (lines, groups, etc.)
    }
  }
}

JSON.stringify(samples);
`;
}
