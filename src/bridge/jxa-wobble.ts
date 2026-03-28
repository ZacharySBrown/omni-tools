/**
 * JXA helper functions for xkcd-style wobbly bezier paths.
 * Injected into OmniGraffle scripts when hand_drawn.enabled is true.
 * These run inside the osascript JXA context, not in Node.
 */
export const JXA_WOBBLE_HELPERS = `
// Seeded PRNG (mulberry32) for deterministic wobble
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var _wobbleRng = mulberry32(
  PRESET.hand_drawn && PRESET.hand_drawn.wobble_seed
    ? PRESET.hand_drawn.wobble_seed
    : 42
);

function wobbleOffset(amplitude) {
  return ((_wobbleRng() - 0.5) * 2) * amplitude;
}

/**
 * Generate wobbly points along a rectangle outline.
 * Returns an array of {x, y} points that form a hand-drawn rectangle.
 * The points follow the perimeter with small random perturbations.
 */
function wobbleRect(x, y, w, h, amplitude, frequency) {
  var points = [];
  var segLen = 1.0 / frequency; // pixels per segment

  // Walk each edge, subdividing into segments and perturbing
  var edges = [
    {x0: x, y0: y, x1: x + w, y1: y},         // top
    {x0: x + w, y0: y, x1: x + w, y1: y + h}, // right
    {x0: x + w, y0: y + h, x1: x, y1: y + h}, // bottom
    {x0: x, y0: y + h, x1: x, y1: y},          // left
  ];

  for (var e = 0; e < edges.length; e++) {
    var edge = edges[e];
    var dx = edge.x1 - edge.x0;
    var dy = edge.y1 - edge.y0;
    var edgeLen = Math.sqrt(dx * dx + dy * dy);
    var numSegs = Math.max(2, Math.round(edgeLen * frequency));
    // Normal perpendicular to edge direction
    var nx = -dy / edgeLen;
    var ny = dx / edgeLen;

    for (var i = 0; i < numSegs; i++) {
      var t = i / numSegs;
      var px = edge.x0 + dx * t;
      var py = edge.y0 + dy * t;
      // Perturb perpendicular to edge, less at corners
      var cornerDamp = Math.min(t, 1 - t) * 4;
      cornerDamp = Math.min(cornerDamp, 1);
      var offset = wobbleOffset(amplitude) * cornerDamp;
      points.push({x: px + nx * offset, y: py + ny * offset});
    }
  }

  // Close the path
  if (points.length > 0) {
    points.push({x: points[0].x, y: points[0].y});
  }

  return points;
}

/**
 * Generate wobbly points along a circle/ellipse outline.
 */
function wobbleEllipse(cx, cy, rx, ry, amplitude, frequency) {
  var circumference = 2 * Math.PI * Math.max(rx, ry);
  var numPoints = Math.max(12, Math.round(circumference * frequency));
  var points = [];

  for (var i = 0; i <= numPoints; i++) {
    var angle = (i / numPoints) * 2 * Math.PI;
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    var offset = wobbleOffset(amplitude);
    points.push({
      x: cx + (rx + offset) * cos,
      y: cy + (ry + offset) * sin
    });
  }

  return points;
}

/**
 * Generate wobbly points along a diamond outline.
 */
function wobbleDiamond(x, y, w, h, amplitude, frequency) {
  var cx = x + w / 2;
  var cy = y + h / 2;
  var vertices = [
    {x: cx, y: y},          // top
    {x: x + w, y: cy},      // right
    {x: cx, y: y + h},      // bottom
    {x: x, y: cy},          // left
  ];

  var points = [];
  for (var v = 0; v < vertices.length; v++) {
    var v0 = vertices[v];
    var v1 = vertices[(v + 1) % vertices.length];
    var dx = v1.x - v0.x;
    var dy = v1.y - v0.y;
    var edgeLen = Math.sqrt(dx * dx + dy * dy);
    var numSegs = Math.max(2, Math.round(edgeLen * frequency));
    var nx = -dy / edgeLen;
    var ny = dx / edgeLen;

    for (var i = 0; i < numSegs; i++) {
      var t = i / numSegs;
      var px = v0.x + dx * t;
      var py = v0.y + dy * t;
      var cornerDamp = Math.min(t, 1 - t) * 4;
      cornerDamp = Math.min(cornerDamp, 1);
      var offset = wobbleOffset(amplitude) * cornerDamp;
      points.push({x: px + nx * offset, y: py + ny * offset});
    }
  }

  if (points.length > 0) {
    points.push({x: points[0].x, y: points[0].y});
  }

  return points;
}

/**
 * Generate wobbly intermediate points for a connector line.
 */
function wobbleConnectorPoints(srcGeo, dstGeo, amplitude) {
  var x0 = srcGeo.x + srcGeo.width / 2;
  var y0 = srcGeo.y + srcGeo.height / 2;
  var x1 = dstGeo.x + dstGeo.width / 2;
  var y1 = dstGeo.y + dstGeo.height / 2;
  var dx = x1 - x0;
  var dy = y1 - y0;
  var len = Math.sqrt(dx * dx + dy * dy);
  var nx = -dy / len;
  var ny = dx / len;

  var numMidPoints = Math.max(2, Math.round(len / 30));
  var points = [{x: x0, y: y0}];

  for (var i = 1; i < numMidPoints; i++) {
    var t = i / numMidPoints;
    var px = x0 + dx * t;
    var py = y0 + dy * t;
    var offset = wobbleOffset(amplitude * 0.6);
    points.push({x: px + nx * offset, y: py + ny * offset});
  }

  points.push({x: x1, y: y1});
  return points;
}

/**
 * Draw a shape using wobbly bezier path as a custom OmniGraffle shape.
 * Falls back to a standard shape overlay with a wobbly line path on top.
 */
function drawWobblyShape(canvas, og, shapeType, x, y, w, h, amplitude, frequency) {
  var amp = amplitude || 3.0;
  var freq = frequency || 0.15;
  var points;

  if (shapeType === "circle") {
    points = wobbleEllipse(x + w / 2, y + h / 2, w / 2, h / 2, amp, freq);
  } else if (shapeType === "diamond") {
    points = wobbleDiamond(x, y, w, h, amp, freq);
  } else {
    points = wobbleRect(x, y, w, h, amp, freq);
  }

  // Create the base shape at the correct geometry for text and connections
  var s = og.Shape({ within: canvas });
  s.geometry = { x: x, y: y, width: w, height: h };

  // Draw the wobbly outline as a separate line overlaying the shape
  if (points.length > 1) {
    var wobbleLine = og.Line({ within: canvas });
    wobbleLine.pointList = points;
    wobbleLine.headType = "";
    wobbleLine.tailType = "";
    wobbleLine.lineType = "curved";
  }

  return { shape: s, wobbleLine: wobbleLine };
}
`;
