#!/usr/bin/env osascript -l JavaScript
//
// readback.js — JXA script to extract all shape geometries and styles
// from the frontmost OmniGraffle document.
//
// Usage:
//   osascript readback.js
//   osascript readback.js > output.json
//
// Returns JSON with canvas info and all shapes/lines with their
// geometry, fill, stroke, text, and connection info.
//

function run() {
  const og = Application("OmniGraffle");
  og.includeStandardAdditions = true;

  const doc = og.documents[0];
  if (!doc) {
    return JSON.stringify({ error: "No document open in OmniGraffle" });
  }

  const result = {
    document: {
      name: doc.name(),
    },
    canvases: [],
  };

  const canvases = doc.canvases();
  for (let ci = 0; ci < canvases.length; ci++) {
    const canvas = canvases[ci];
    const canvasData = {
      name: canvas.name(),
      size: {
        width: canvas.canvasSize().width,
        height: canvas.canvasSize().height,
      },
      shapes: [],
      lines: [],
    };

    // Extract all shapes (non-line graphics)
    const shapes = canvas.shapes();
    for (let si = 0; si < shapes.length; si++) {
      const s = shapes[si];
      const geom = s.geometry();
      const shapeData = {
        id: s.id(),
        name: s.name(),
        text: s.text(),
        shapeType: s.shape(),
        geometry: {
          x: geom.x,
          y: geom.y,
          width: geom.width,
          height: geom.height,
        },
        style: {
          fillColor: colorToHex(s.fillColor()),
          strokeColor: colorToHex(s.strokeColor()),
          strokeThickness: s.strokeThickness(),
          cornerRadius: s.cornerRadius(),
        },
        textStyle: {
          font: s.font(),
          size: s.size(),
          textColor: colorToHex(s.textColor()),
          alignment: s.alignment(),
        },
      };
      canvasData.shapes.push(shapeData);
    }

    // Extract all lines/connectors
    const lines = canvas.lines();
    for (let li = 0; li < lines.length; li++) {
      const l = lines[li];
      const lineData = {
        id: l.id(),
        source: l.source() ? l.source().name() : null,
        destination: l.destination() ? l.destination().name() : null,
        text: l.text(),
        points: l.pointList().map(function (p) {
          return { x: p.x, y: p.y };
        }),
        style: {
          strokeColor: colorToHex(l.strokeColor()),
          strokeThickness: l.strokeThickness(),
          headType: l.headType(),
          tailType: l.tailType(),
          lineType: l.lineType(),
        },
      };
      canvasData.lines.push(lineData);
    }

    result.canvases.push(canvasData);
  }

  return JSON.stringify(result, null, 2);
}

function colorToHex(color) {
  // OmniGraffle colors are {red, green, blue, alpha} with 0-1 range
  if (!color) return null;
  try {
    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    return (
      "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0")
    ).toUpperCase();
  } catch (e) {
    return null;
  }
}
