import type { StyleTokens } from "../types/styles.js";
import type { DiagramNode, DiagramConnection, LayoutType, CanvasType } from "../types/diagram.js";

export interface BuildDiagramScriptOptions {
  title: string;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  layout: LayoutType;
  canvasType: CanvasType;
  preset: StyleTokens;
  exportPath?: string;
  exportFormat?: string;
}

/**
 * Build a JXA script that creates an OmniGraffle diagram.
 *
 * Strategy: JXA creates the document, then evaluateJavascript() runs
 * Omni Automation code inside OmniGraffle to create shapes and connections.
 * This is the only reliable way to set colors and connect shapes.
 */
export function buildDiagramScript(opts: BuildDiagramScriptOptions): string {
  const { title, nodes, connections, layout, preset } = opts;

  // Pre-resolve colors in TypeScript so OmniJS only needs hex→Color.RGB
  const nodeData = nodes.map((n) => {
    const roleMap = preset.semantic_roles as Record<string, string>;
    const colorKey = roleMap[n.role] ?? "surface";
    const colors = preset.colors as Record<string, string>;
    const fillHex = n.color_override ?? colors[colorKey] ?? preset.colors.surface;
    const darkRoles = ["encoder", "decoder", "attention", "output"];
    const textHex = darkRoles.includes(n.role)
      ? preset.colors.text_on_primary
      : preset.colors.text_primary;

    return {
      id: n.id,
      label: n.sublabel ? `${n.label}\n${n.sublabel}` : n.label,
      shape: n.shape,
      x: n.x,
      y: n.y,
      w: n.width ?? preset.shapes.min_node_width,
      h: n.height ?? preset.shapes.min_node_height,
      fillHex,
      textHex,
      cornerRadius: (n.shape === "pill" || n.shape === "token_cell")
        ? preset.shapes.pill_corner_radius
        : preset.shapes.node_corner_radius,
    };
  });

  const connData = connections.map((c) => ({
    from: c.from,
    to: c.to,
    label: c.label,
    style: c.style,
    colorHex: c.color_override
      ?? (c.style === "highlight" ? preset.colors.connector_highlight : preset.colors.connector),
    width: c.style === "highlight"
      ? preset.connectors.default_width * 1.5
      : preset.connectors.default_width,
  }));

  const omniPayload = JSON.stringify({
    title,
    layout,
    nodes: nodeData,
    conns: connData,
    font: preset.typography.label_font,
    textSize: preset.typography.sizes.md,
    arrowStyle: preset.connectors.arrow_style,
  });

  // This function runs INSIDE OmniGraffle via evaluateJavascript
  const omniFunc = `function(data) {
  var canvas = (document.windows.length > 0 && document.windows[0].selection)
    ? document.windows[0].selection.canvas
    : null;
  if (!canvas) canvas = document.portfolio.canvases[0];
  canvas.name = data.title;

  function hexToRGB(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, 1);
  }

  var ogShapeMap = {
    "rectangle": "Rectangle",
    "rounded_rectangle": "RoundedRectangle",
    "diamond": "Diamond",
    "circle": "Circle",
    "token_cell": "RoundedRectangle",
    "pill": "RoundedRectangle",
    "annotation": "Rectangle"
  };

  var shapes = {};
  var cols = Math.ceil(Math.sqrt(data.nodes.length));

  for (var i = 0; i < data.nodes.length; i++) {
    var n = data.nodes[i];
    var defaultX = 50 + (i % cols) * (n.w + 80);
    var defaultY = 50 + Math.floor(i / cols) * (n.h + 100);
    var x = (n.x !== undefined && n.x !== null) ? n.x : defaultX;
    var y = (n.y !== undefined && n.y !== null) ? n.y : defaultY;

    var shapeName = ogShapeMap[n.shape] || "RoundedRectangle";
    var shape = canvas.addShape(shapeName, new Rect(x, y, n.w, n.h));
    shape.name = n.id;
    shape.text = n.label;
    shape.fillColor = hexToRGB(n.fillHex);
    shape.strokeColor = hexToRGB(n.fillHex);
    shape.strokeThickness = 0;
    shape.shadowColor = null;
    shape.cornerRadius = n.cornerRadius;
    shape.fontName = data.font;
    shape.textSize = data.textSize;
    shape.textColor = hexToRGB(n.textHex);
    shape.textHorizontalAlignment = HorizontalTextAlignment.Center;
    shape.textVerticalPlacement = VerticalTextPlacement.Middle;

    shapes[n.id] = shape;
  }

  for (var c = 0; c < data.conns.length; c++) {
    var conn = data.conns[c];
    var src = shapes[conn.from];
    var dst = shapes[conn.to];
    if (!src || !dst) continue;

    var line = canvas.connect(src, dst);
    line.strokeColor = hexToRGB(conn.colorHex);
    line.strokeThickness = conn.width;
    line.headType = data.arrowStyle;
    line.tailType = (conn.style === "bidirectional") ? data.arrowStyle : "";
    line.lineType = LineType.Orthogonal;
    line.shadowColor = null;

    if (conn.style === "dashed") {
      try { line.strokePattern = StrokeDash.Dot3; } catch(e) {}
    }
  }

  if (data.layout !== "manual") {
    canvas.layout();
  }

  return "created:" + data.nodes.length + ":" + data.conns.length;
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.5);
og.Document().make();
delay(1);

var data = ${omniPayload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");

${opts.exportPath ? `
delay(0.5);
og.documents[0].save({
  in: Path(${JSON.stringify(opts.exportPath)}),
  as: ${JSON.stringify(opts.exportFormat ?? "PNG")}
});
result = result + "|exported";
` : ""}

result;
`;
}
