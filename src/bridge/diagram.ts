import type { StyleTokens } from "../types/styles.js";
import type { DiagramNode, DiagramConnection, LayoutType, CanvasType } from "../types/diagram.js";
import { emitColorHelpers, emitShapeMap, emitSyncLayout, emitCanvasFit } from "./omnijs-helpers.js";

export interface BuildDiagramScriptOptions {
  title: string;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  layout: LayoutType;
  canvasType: CanvasType;
  preset: StyleTokens;
  savePath?: string;
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
    const textHex = n.text_color
      ?? ((n.opacity === 0 && n.color_override)
        ? n.color_override
        : darkRoles.includes(n.role)
          ? preset.colors.text_on_primary
          : preset.colors.text_primary);

    const label = n.sublabel ? `${n.label}\n${n.sublabel}` : n.label;
    const lines = label.split("\n");
    const longestLine = Math.max(...lines.map(l => l.length));
    const charWidth = preset.typography.sizes.md * 0.6;
    const lineHeight = preset.typography.sizes.md * 1.6;
    const padH = 32;
    const padV = 24;
    const autoW = Math.max(preset.shapes.min_node_width, Math.round(longestLine * charWidth + padH * 2));
    const autoH = Math.max(preset.shapes.min_node_height, Math.round(lines.length * lineHeight + padV * 2));

    return {
      id: n.id, role: n.role, label, shape: n.shape,
      x: n.x, y: n.y, w: n.width ?? autoW, h: n.height ?? autoH,
      fillHex, strokeHex: n.stroke_color ?? null, textHex,
      cornerRadius: (n.shape === "pill" || n.shape === "token_cell")
        ? preset.shapes.pill_corner_radius
        : (n.shape === "rectangle" || n.shape === "annotation")
          ? 0 : preset.shapes.node_corner_radius,
      magnets: n.magnets ?? null, opacity: n.opacity ?? null,
      fontSize: n.font_size ?? null,
    };
  });

  const connData = connections.map((c) => ({
    from: c.from, to: c.to, label: c.label, style: c.style,
    colorHex: c.color_override
      ?? (c.style === "highlight" ? preset.colors.connector_highlight : preset.colors.connector),
    width: c.style === "highlight"
      ? preset.connectors.default_width * 1.5 : preset.connectors.default_width,
    tailMagnet: c.tail_magnet ?? null, headMagnet: c.head_magnet ?? null,
    lineType: c.line_type ?? null,
  }));

  const omniPayload = JSON.stringify({
    title, layout, nodes: nodeData, conns: connData,
    style: {
      font: preset.typography.label_font,
      headingFont: preset.typography.heading_font,
      textSize: preset.typography.sizes.md,
      sublabelSize: preset.typography.sizes.sm,
      arrowStyle: preset.connectors.arrow_style,
      connectorRouting: preset.connectors.routing,
      hPad: 16, vPad: 12,
      rankSep: preset.layout.node_v_spacing + 40,
      objSep: preset.layout.node_h_spacing + 20,
    },
  });

  // This function runs INSIDE OmniGraffle via evaluateJavascript
  const omniFunc = `function(data) {
  var canvas = (document.windows.length > 0 && document.windows[0].selection)
    ? document.windows[0].selection.canvas
    : null;
  if (!canvas) canvas = document.portfolio.canvases[0];
  canvas.name = data.title;
  canvas.canvasSizeMeasuredInPages = false;

  var S = data.style;

${emitColorHelpers()}
${emitShapeMap()}

  var shapes = {};
  var cols = Math.ceil(Math.sqrt(data.nodes.length));

  for (var i = 0; i < data.nodes.length; i++) {
    var n = data.nodes[i];
    var defaultX = 50 + (i % cols) * (n.w + 100);
    var defaultY = 50 + Math.floor(i / cols) * (n.h + 120);
    var x = (n.x !== undefined && n.x !== null) ? n.x : defaultX;
    var y = (n.y !== undefined && n.y !== null) ? n.y : defaultY;

    var shapeName = ogShapeMap[n.shape] || "RoundedRectangle";
    var shape = canvas.addShape(shapeName, new Rect(x, y, n.w, n.h));

    shape.name = n.id;
    shape.fillColor = hexToRGB(n.fillHex);
    shape.strokeColor = n.strokeHex ? hexToRGB(n.strokeHex) : darkenHex(n.fillHex, 0.75);
    shape.strokeThickness = 1.5;
    shape.shadowColor = null;
    shape.cornerRadius = n.cornerRadius;
    if (n.opacity !== null && n.opacity !== undefined) {
      shape.fillColor = hexToRGBA(n.fillHex, n.opacity);
      if (n.opacity === 0) {
        shape.strokeThickness = 0;
      }
    }

    shape.textHorizontalPadding = S.hPad;
    shape.textVerticalPadding = S.vPad;
    shape.textWraps = true;
    shape.fontName = S.font;
    shape.textSize = n.fontSize || S.textSize;
    shape.textColor = hexToRGB(n.textHex);
    shape.textHorizontalAlignment = HorizontalTextAlignment.Center;
    shape.textVerticalPlacement = VerticalTextPlacement.Middle;
    shape.text = n.label;
    shape.setUserData("role", n.role);

    if (n.magnets && n.magnets.length > 0) {
      shape.magnets = [];
      for (var mi = 0; mi < n.magnets.length; mi++) {
        shape.magnets.push(new Point(n.magnets[mi].x, n.magnets[mi].y));
      }
    } else {
      shape.magnets = [new Point(0, -0.5), new Point(0, 0.5), new Point(-0.5, 0), new Point(0.5, 0)];
    }

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
    line.headType = S.arrowStyle;
    line.tailType = (conn.style === "bidirectional") ? S.arrowStyle : "";
    line.shadowColor = null;

    var srcGeo = src.geometry;
    var dstGeo = dst.geometry;
    var srcCx = srcGeo.x + srcGeo.width / 2;
    var srcCy = srcGeo.y + srcGeo.height / 2;
    var dstCx = dstGeo.x + dstGeo.width / 2;
    var dstCy = dstGeo.y + dstGeo.height / 2;
    var adx = Math.abs(dstCx - srcCx);
    var ady = Math.abs(dstCy - srcCy);

    if (conn.lineType === "straight") {
      line.lineType = LineType.Straight;
    } else if (conn.lineType === "curved") {
      line.lineType = LineType.Curved;
    } else if (conn.lineType === "orthogonal") {
      line.lineType = LineType.Orthogonal;
      line.hopType = HopType.Round;
    } else {
      if (ady > adx) {
        line.lineType = (adx < 20) ? LineType.Straight : LineType.Orthogonal;
      } else {
        line.lineType = (ady < 20) ? LineType.Straight : LineType.Orthogonal;
      }
      if (line.lineType === LineType.Orthogonal) {
        line.hopType = HopType.Round;
      }
    }

    if (conn.tailMagnet !== null && conn.tailMagnet !== undefined) {
      line.tailMagnet = conn.tailMagnet;
    } else if (ady > adx) {
      line.tailMagnet = (dstCy < srcCy) ? 1 : 2;
    } else {
      line.tailMagnet = (dstCx > srcCx) ? 4 : 3;
    }

    if (conn.headMagnet !== null && conn.headMagnet !== undefined) {
      line.headMagnet = conn.headMagnet;
    } else if (ady > adx) {
      line.headMagnet = (dstCy < srcCy) ? 2 : 1;
    } else {
      line.headMagnet = (dstCx > srcCx) ? 3 : 4;
    }

    if (conn.label) {
      line.text = conn.label;
      line.fontName = S.font;
      line.textSize = S.sublabelSize || 13;
      line.textColor = hexToRGB(conn.colorHex);
    }

    if (conn.style === "dashed") {
      try { line.strokePattern = StrokeDash.Dot3; } catch(e) {}
    }
  }

${emitSyncLayout()}
${emitCanvasFit()}

  return "created:" + data.nodes.length + ":" + data.conns.length + "|bbox:" + minX + "," + minY + "," + maxX + "," + maxY + "|canvas:" + contentW + "x" + contentH;
}`;

  return `
var og = Application("OmniGraffle");
og.activate();
delay(0.5);
og.Document().make();
delay(1);

var data = ${omniPayload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");

// Save to disk, close untitled doc, reopen from file so it's fully editable
delay(0.3);
var saveDir = ${JSON.stringify(opts.savePath ?? "/tmp")};
var savePath = saveDir + "/" + ${JSON.stringify(title.replace(/[^a-zA-Z0-9_\- ]/g, ""))} + ".graffle";
og.documents[0].save({ in: Path(savePath) });
delay(0.3);
og.documents[0].close({ saving: "no" });
delay(0.3);
og.open(Path(savePath));

${opts.exportPath ? `
delay(0.5);
var app = Application.currentApplication();
app.includeStandardAdditions = true;
app.doShellScript('osascript -e \\'tell application "OmniGraffle" to export front document scope current canvas as "${opts.exportFormat ?? "PNG"}" to POSIX file "${opts.exportPath}" with properties {resolution:2.0, draws background:false}\\'');
result = result + "|exported";
` : ""}

result;
`;
}
