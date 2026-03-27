#!/usr/bin/env osascript -l JavaScript
//
// readback.js — JXA script that uses evaluateJavascript() to extract
// all shape geometries and styles from the frontmost OmniGraffle document.
//
// Usage:
//   osascript readback.js
//   osascript readback.js > output.json
//
// Returns JSON with canvas info, shapes (geometry + fill + text), and lines.
//

function run() {
  const og = Application("OmniGraffle");
  og.includeStandardAdditions = true;

  if (og.documents.length === 0) {
    return JSON.stringify({ error: "No document open in OmniGraffle" });
  }

  // Run inside OmniGraffle via Omni Automation where the geometry API works
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
            geometry: {
              x: Math.round(geo.x),
              y: Math.round(geo.y),
              width: Math.round(geo.width),
              height: Math.round(geo.height)
            },
            style: {
              strokeColor: colorToHex(g.strokeColor),
              strokeThickness: g.strokeThickness,
              lineType: "" + g.lineType
            }
          });
        } else if (g instanceof Shape) {
          canvasData.shapes.push({
            id: "" + g.id,
            name: g.name || "",
            text: "" + (g.text || ""),
            geometry: {
              x: Math.round(geo.x),
              y: Math.round(geo.y),
              width: Math.round(geo.width),
              height: Math.round(geo.height)
            },
            style: {
              fillColor: colorToHex(g.fillColor),
              strokeColor: colorToHex(g.strokeColor),
              strokeThickness: g.strokeThickness,
              cornerRadius: g.cornerRadius
            },
            textStyle: {
              fontName: g.fontName,
              textSize: g.textSize,
              textColor: colorToHex(g.textColor)
            }
          });
        }
      }

      result.canvases.push(canvasData);
    }

    return JSON.stringify(result, null, 2);
  })()`;

  return og.evaluateJavascript(omniCode);
}
