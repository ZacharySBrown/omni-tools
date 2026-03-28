import type { StyleTokens } from "../types/styles.js";
import type { DiagramNode, DiagramConnection, LayoutType, CanvasType } from "../types/diagram.js";
import { JXA_HELPERS } from "./jxa-helpers.js";
import { JXA_WOBBLE_HELPERS } from "./jxa-wobble.js";

export interface BuildDiagramScriptOptions {
  title: string;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  layout: LayoutType;
  canvasType: CanvasType;
  preset: StyleTokens;
}

export function buildDiagramScript(opts: BuildDiagramScriptOptions): string {
  const { title, nodes, connections, layout, canvasType, preset } = opts;

  const canvasW = canvasType === "slide"
    ? preset.layout.canvas_width_slide
    : preset.layout.canvas_width_diagram;
  const canvasH = canvasType === "slide"
    ? preset.layout.canvas_height_slide
    : preset.layout.canvas_height_diagram;

  // Safely inject data as JSON.parse'd strings — no template interpolation of user content
  const presetJson = JSON.stringify(preset);
  const nodesJson = JSON.stringify(nodes);
  const connectionsJson = JSON.stringify(connections);

  const handDrawn = preset.hand_drawn?.enabled ?? false;
  const wobbleHelpers = handDrawn ? JXA_WOBBLE_HELPERS : "";

  return `
var og = Application("OmniGraffle");
og.activate();

var PRESET = ${presetJson};
var NODES = ${nodesJson};
var CONNECTIONS = ${connectionsJson};
var TITLE = ${JSON.stringify(title)};
var LAYOUT = ${JSON.stringify(layout)};
var CANVAS_W = ${canvasW};
var CANVAS_H = ${canvasH};
var HAND_DRAWN = ${JSON.stringify(handDrawn)};

${JXA_HELPERS}
${wobbleHelpers}

// --- Create document ---
var doc = og.Document.make();
var canvas = doc.canvases[0];
canvas.name = TITLE;
canvas.canvasSize = { width: CANVAS_W, height: CANVAS_H };
canvas.background = { color: hex2color(PRESET.colors.background) };

// --- Draw nodes ---
var shapeMap = {};
NODES.forEach(function(node) {
  var fill = node.color_override || roleToFillHex(node.role, PRESET);
  var textColor = roleToTextHex(node.role, PRESET);
  var w = node.width || PRESET.shapes.min_node_width;
  var h = node.height || PRESET.shapes.min_node_height;
  var x = node.x || 100;
  var y = node.y || 100;

  var s;
  var wobbleStrokeColor = null;

  if (HAND_DRAWN && PRESET.hand_drawn) {
    var amp = PRESET.hand_drawn.wobble_amplitude || 3.0;
    var freq = PRESET.hand_drawn.wobble_frequency || 0.15;
    var shapeType = node.shape === "circle" ? "circle" :
                    node.shape === "diamond" ? "diamond" : "rect";
    var result = drawWobblyShape(canvas, og, shapeType, x, y, w, h, amp, freq);
    s = result.shape;
    wobbleStrokeColor = PRESET.hand_drawn.stroke_color_override || "#000000";

    // Style the wobbly outline
    if (result.wobbleLine) {
      result.wobbleLine.strokeColor = hex2color(wobbleStrokeColor);
      result.wobbleLine.strokeThickness = PRESET.shapes.stroke_width_default;
    }

    // Hide the base shape's stroke (the wobble line replaces it)
    s.shape = "Rectangle";
    s.strokeThickness = 0;
  } else {
    s = og.Shape({ within: canvas });
    s.geometry = { x: x, y: y, width: w, height: h };

    if (node.shape === "diamond") {
      s.shape = "Diamond";
    } else if (node.shape === "circle") {
      s.shape = "Circle";
    } else {
      s.shape = "Rectangle";
    }

    s.strokeColor = hex2color(fill);
    s.strokeThickness = PRESET.shapes.stroke_width_default;
  }

  s.fillColor = hex2color(fill);

  if (node.shape === "pill" || node.shape === "token_cell") {
    s.cornerRadius = PRESET.shapes.pill_corner_radius;
  } else {
    s.cornerRadius = PRESET.shapes.node_corner_radius;
  }

  s.text = node.label;
  s.textColor = hex2color(textColor);
  s.textSize = PRESET.typography.sizes.md;
  s.font = PRESET.typography.label_font;
  s.textHorizontalAlignment = "center";
  s.textVerticalPlacement = "middle";
  s.name = node.id;

  shapeMap[node.id] = s;
});

// --- Draw connections ---
CONNECTIONS.forEach(function(conn) {
  var src = shapeMap[conn.from];
  var dst = shapeMap[conn.to];
  if (!src || !dst) return;

  var line = og.Line({ within: canvas });

  if (HAND_DRAWN && PRESET.hand_drawn) {
    // Generate wobbly intermediate points for the connector
    var wobblePoints = wobbleConnectorPoints(
      src.geometry, dst.geometry,
      PRESET.hand_drawn.wobble_amplitude || 3.0
    );
    line.pointList = wobblePoints;
  } else {
    line.pointList = [src.geometry, dst.geometry];
  }

  line.source = src;
  line.destination = dst;

  var strokeHex = conn.color_override ||
    (conn.style === "highlight" ? PRESET.colors.connector_highlight : PRESET.colors.connector);

  if (HAND_DRAWN && PRESET.hand_drawn && PRESET.hand_drawn.stroke_color_override) {
    strokeHex = PRESET.hand_drawn.stroke_color_override;
  }

  line.strokeColor = hex2color(strokeHex);
  line.strokeThickness = (conn.style === "highlight")
    ? PRESET.connectors.default_width * 1.5
    : PRESET.connectors.default_width;
  line.headType = PRESET.connectors.arrow_style;
  line.tailType = (conn.style === "bidirectional") ? PRESET.connectors.arrow_style : "";
  line.lineType = HAND_DRAWN ? "curved" : PRESET.connectors.routing;

  if (conn.label) {
    line.text = conn.label;
    line.textSize = PRESET.connectors.label_font_size;
    if (HAND_DRAWN) {
      line.font = PRESET.typography.label_font;
    }
  }
});

// --- Auto layout ---
if (LAYOUT !== "manual") {
  var layoutEngine = (LAYOUT === "auto_force") ? "Force-directed" :
                     (LAYOUT === "auto_circular") ? "Circular" : "Hierarchical";
  canvas.layoutInfo = { type: layoutEngine };
  canvas.layout();
}

"done";
`;
}
