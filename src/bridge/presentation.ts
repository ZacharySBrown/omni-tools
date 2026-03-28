import type { ResolvedSlide } from "../presentation/resolver.js";
import { emitColorHelpers, emitShapeMap, emitCanvasFit, emitSyncLayoutFunc } from "./omnijs-helpers.js";

export interface BuildPresentationScriptOptions {
  title: string;
  slides: ResolvedSlide[];
  savePath?: string;
  exportDir?: string;
  exportFormat?: string;
}

/**
 * Prepare node/connection data from a resolved slide for the OmniJS payload.
 * Shared between single-slide and deck rendering.
 */
function prepareSlideData(slide: ResolvedSlide) {
  const preset = slide.preset;
  const visibleNodes = slide.nodes.filter((n) => n.state !== "hidden");
  const visibleConns = slide.connections.filter((c) => c.state !== "hidden");

  const nodeData = visibleNodes.map((n) => {
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
    const longestLine = Math.max(...lines.map((l) => l.length));
    const charWidth = preset.typography.sizes.md * 0.6;
    const lineHeight = preset.typography.sizes.md * 1.6;
    const padH = 32;
    const padV = 24;
    const autoW = Math.max(preset.shapes.min_node_width, Math.round(longestLine * charWidth + padH * 2));
    const autoH = Math.max(preset.shapes.min_node_height, Math.round(lines.length * lineHeight + padV * 2));
    return {
      id: n.id, role: n.role, label, shape: n.shape, state: n.state,
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

  const connData = visibleConns.map((c) => ({
    from: c.from, to: c.to, label: c.label, style: c.style, state: c.state,
    colorHex: c.color_override
      ?? (c.style === "highlight" ? preset.colors.connector_highlight : preset.colors.connector),
    width: c.style === "highlight"
      ? preset.connectors.default_width * 1.5 : preset.connectors.default_width,
    tailMagnet: c.tail_magnet ?? null, headMagnet: c.head_magnet ?? null,
    lineType: c.line_type ?? null,
  }));

  const annotationData = slide.annotations.map((a) => ({
    text: a.text, x: a.x, y: a.y, style: a.style,
  }));

  return { nodeData, connData, annotationData };
}

function stylePayload(preset: ResolvedSlide["preset"]) {
  return {
    font: preset.typography.label_font,
    headingFont: preset.typography.heading_font,
    textSize: preset.typography.sizes.md,
    sublabelSize: preset.typography.sizes.sm,
    arrowStyle: preset.connectors.arrow_style,
    connectorRouting: preset.connectors.routing,
    hPad: 16, vPad: 12,
    rankSep: preset.layout.node_v_spacing + 40,
    objSep: preset.layout.node_h_spacing + 20,
    dimOpacity: 0.25,
    highlightStroke: 2.5,
    textSecondary: preset.colors.text_secondary,
    annotationSize: preset.typography.sizes.sm,
    bodyFont: preset.typography.body_font,
  };
}

// Shared OmniJS code for rendering shapes, connections, annotations on a layer
const RENDER_SHAPES = `
  function renderShapes(canvas, layer, data, S) {
    var shapes = {};
    for (var i = 0; i < data.nodes.length; i++) {
      var n = data.nodes[i];
      var defaultX = 50 + (i % 4) * (n.w + 100);
      var defaultY = 80 + Math.floor(i / 4) * (n.h + 120);
      var x = (n.x !== undefined && n.x !== null) ? n.x : defaultX;
      var y = (n.y !== undefined && n.y !== null) ? n.y : defaultY;
      var shapeName = ogShapeMap[n.shape] || "RoundedRectangle";
      var shape = layer.addShape(shapeName, new Rect(x, y, n.w, n.h));
      shape.name = n.id;
      shape.shadowColor = null;
      shape.cornerRadius = n.cornerRadius;
      if (n.state === "dimmed") {
        shape.fillColor = hexToRGBA(n.fillHex, S.dimOpacity);
        shape.strokeColor = n.strokeHex ? hexToRGBA(n.strokeHex, S.dimOpacity) : darkenHexAlpha(n.fillHex, 0.75, S.dimOpacity);
        shape.strokeThickness = 1.5;
        shape.textColor = hexToRGBA(n.textHex, S.dimOpacity);
      } else if (n.state === "highlighted") {
        shape.fillColor = hexToRGB(n.fillHex);
        shape.strokeColor = n.strokeHex ? hexToRGB(n.strokeHex) : darkenHex(n.fillHex, 0.75);
        shape.strokeThickness = S.highlightStroke;
        shape.textColor = hexToRGB(n.textHex);
      } else {
        shape.fillColor = hexToRGB(n.fillHex);
        shape.strokeColor = n.strokeHex ? hexToRGB(n.strokeHex) : darkenHex(n.fillHex, 0.75);
        shape.strokeThickness = 1.5;
        shape.textColor = hexToRGB(n.textHex);
      }
      if (n.opacity !== null && n.opacity !== undefined) {
        shape.fillColor = hexToRGBA(n.fillHex, n.opacity);
        if (n.opacity === 0) shape.strokeThickness = 0;
      }
      shape.textHorizontalPadding = S.hPad;
      shape.textVerticalPadding = S.vPad;
      shape.textWraps = true;
      shape.fontName = S.font;
      shape.textSize = n.fontSize || S.textSize;
      shape.textColor = shape.textColor || hexToRGB(n.textHex);
      shape.textHorizontalAlignment = HorizontalTextAlignment.Center;
      shape.textVerticalPlacement = VerticalTextPlacement.Middle;
      shape.text = n.label;
      shape.setUserData("role", n.role);
      shape.setUserData("state", n.state);
      if (n.magnets && n.magnets.length > 0) {
        shape.magnets = [];
        for (var mi = 0; mi < n.magnets.length; mi++) shape.magnets.push(new Point(n.magnets[mi].x, n.magnets[mi].y));
      } else {
        shape.magnets = [new Point(0, -0.5), new Point(0, 0.5), new Point(-0.5, 0), new Point(0.5, 0)];
      }
      shapes[n.id] = shape;
    }
    for (var c = 0; c < data.conns.length; c++) {
      var conn = data.conns[c];
      var src = shapes[conn.from]; var dst = shapes[conn.to];
      if (!src || !dst) continue;
      var line = canvas.connect(src, dst);
      line.layer = layer;
      line.shadowColor = null;
      line.headType = S.arrowStyle;
      line.tailType = (conn.style === "bidirectional") ? S.arrowStyle : "";
      if (conn.state === "dimmed") {
        line.strokeColor = hexToRGBA(conn.colorHex, S.dimOpacity);
        line.strokeThickness = conn.width;
      } else if (conn.state === "highlighted") {
        line.strokeColor = hexToRGB(conn.colorHex);
        line.strokeThickness = conn.width * 1.5;
      } else {
        line.strokeColor = hexToRGB(conn.colorHex);
        line.strokeThickness = conn.width;
      }
      var srcGeo = src.geometry; var dstGeo = dst.geometry;
      var srcCx = srcGeo.x + srcGeo.width/2; var srcCy = srcGeo.y + srcGeo.height/2;
      var dstCx = dstGeo.x + dstGeo.width/2; var dstCy = dstGeo.y + dstGeo.height/2;
      var adx = Math.abs(dstCx - srcCx); var ady = Math.abs(dstCy - srcCy);
      if (conn.lineType === "straight") { line.lineType = LineType.Straight; }
      else if (conn.lineType === "curved") { line.lineType = LineType.Curved; }
      else if (conn.lineType === "orthogonal") { line.lineType = LineType.Orthogonal; line.hopType = HopType.Round; }
      else {
        line.lineType = (ady > adx) ? ((adx < 20) ? LineType.Straight : LineType.Orthogonal) : ((ady < 20) ? LineType.Straight : LineType.Orthogonal);
        if (line.lineType === LineType.Orthogonal) line.hopType = HopType.Round;
      }
      if (conn.tailMagnet !== null && conn.tailMagnet !== undefined) line.tailMagnet = conn.tailMagnet;
      else if (ady > adx) line.tailMagnet = (dstCy < srcCy) ? 1 : 2;
      else line.tailMagnet = (dstCx > srcCx) ? 4 : 3;
      if (conn.headMagnet !== null && conn.headMagnet !== undefined) line.headMagnet = conn.headMagnet;
      else if (ady > adx) line.headMagnet = (dstCy < srcCy) ? 2 : 1;
      else line.headMagnet = (dstCx > srcCx) ? 3 : 4;
      if (conn.label) { line.text = conn.label; line.fontName = S.font; line.textSize = S.sublabelSize || 13; line.textColor = conn.state === "dimmed" ? hexToRGBA(conn.colorHex, S.dimOpacity) : hexToRGB(conn.colorHex); }
      if (conn.style === "dashed") { try { line.strokePattern = StrokeDash.Dot3; } catch(e) {} }
    }
    for (var ai = 0; ai < data.annotations.length; ai++) {
      var ann = data.annotations[ai];
      var estW = Math.max(140, ann.text.length * S.annotationSize * 0.5 + 24);
      var estH = Math.max(30, (ann.text.split("\\n").length) * S.annotationSize * 1.5 + 16);
      var aShape = layer.addShape("Rectangle", new Rect(ann.x, ann.y, estW, estH));
      aShape.fillColor = Color.RGB(0, 0, 0, 0); aShape.strokeThickness = 0; aShape.shadowColor = null;
      aShape.text = ann.text; aShape.fontName = S.bodyFont || S.font;
      aShape.textSize = S.annotationSize; aShape.textColor = hexToRGB(S.textSecondary);
      aShape.textHorizontalAlignment = HorizontalTextAlignment.Left;
      aShape.textVerticalPlacement = VerticalTextPlacement.Top; aShape.textWraps = true;
    }
    return shapes;
  }
`;

/**
 * Build a JXA script that renders a single slide graphic.
 * Creates one OmniGraffle document with one layer.
 */
export function buildSlideScript(opts: { slide: ResolvedSlide; savePath?: string; exportPath?: string; exportFormat?: string }): string {
  const { slide } = opts;
  const { nodeData, connData, annotationData } = prepareSlideData(slide);
  const omniPayload = JSON.stringify({
    canvasName: slide.canvas_name, layout: slide.layout,
    nodes: nodeData, conns: connData, annotations: annotationData,
    style: stylePayload(slide.preset),
  });

  const omniFunc = `function(data) {
  var canvas = document.portfolio.canvases[0];
  canvas.name = data.canvasName;
  canvas.canvasSizeMeasuredInPages = false;
  var S = data.style;
${emitColorHelpers()}
${emitShapeMap()}
${RENDER_SHAPES}
${emitSyncLayoutFunc()}
  var layer = canvas.layers[0];
  layer.name = data.canvasName;
  var shapes = renderShapes(canvas, layer, data, S);
  doSyncLayout(data.nodes, data.conns, shapes, S, data.layout);
${emitCanvasFit()}
  return "slide:" + data.canvasName + "|nodes:" + data.nodes.length + "|conns:" + data.conns.length;
}`;

  return `
var og = Application("OmniGraffle");
og.activate(); delay(0.5);
og.Document().make(); delay(1);
var data = ${omniPayload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");

delay(0.3);
var saveDir = ${JSON.stringify(opts.savePath ?? "/tmp")};
var savePath = saveDir + "/" + ${JSON.stringify(opts.slide.canvas_name.replace(/[^a-zA-Z0-9_\- ]/g, ""))} + ".graffle";
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

/**
 * Build a JXA script that renders a full presentation as layers in one document.
 * Each slide gets its own layer. For export, toggles layer visibility and
 * exports each combination as a numbered asset.
 *
 * Layer structure:
 *   - "Slide 1" layer: all shapes/connections for slide 1's state
 *   - "Slide 2" layer: all shapes/connections for slide 2's state
 *   - etc.
 *
 * Export: for asset N, only layer N is visible → export → next.
 */
export function buildDeckScript(opts: BuildPresentationScriptOptions): string {
  const { title, slides } = opts;
  const slidesPayload = slides.map((slide) => {
    const { nodeData, connData, annotationData } = prepareSlideData(slide);
    return {
      canvasName: slide.canvas_name, title: slide.title,
      layout: slide.layout,
      nodes: nodeData, conns: connData, annotations: annotationData,
    };
  });

  const preset = slides[0].preset;
  const omniPayload = JSON.stringify({
    title,
    slides: slidesPayload,
    style: stylePayload(preset),
    exportDir: opts.exportDir ?? null,
    exportFormat: opts.exportFormat ?? "PNG",
  });

  const omniFunc = `function(data) {
  var canvas = document.portfolio.canvases[0];
  canvas.name = data.title;
  canvas.canvasSizeMeasuredInPages = false;
  var S = data.style;
${emitColorHelpers()}
${emitShapeMap()}
${RENDER_SHAPES}
${emitSyncLayoutFunc()}

  var layers = [];
  for (var si = 0; si < data.slides.length; si++) {
    var slideData = data.slides[si];
    var layer;
    if (si === 0) {
      layer = canvas.layers[0];
    } else {
      layer = canvas.newLayer();
    }
    layer.name = slideData.title || slideData.canvasName;
    var shapes = renderShapes(canvas, layer, slideData, S);
    doSyncLayout(slideData.nodes, slideData.conns, shapes, S, slideData.layout);
    layers.push(layer);
  }

  // Fit canvas to all content (all layers visible)
${emitCanvasFit()}

  // Hide all layers except the first (default view = slide 1)
  for (var li = 0; li < layers.length; li++) {
    layers[li].visible = (li === 0);
  }

  return "deck:" + data.title + "|slides:" + data.slides.length + "|layers:" + layers.length;
}`;

  // Build the export loop: for each slide, show only that layer, export, move on
  let exportScript = "";
  if (opts.exportDir) {
    const fmt = opts.exportFormat ?? "PNG";
    const ext = fmt.toLowerCase();
    exportScript = `
delay(0.5);
var app = Application.currentApplication();
app.includeStandardAdditions = true;

// Export each layer combination
var exportCode = '(function() {\\
  var canvas = document.portfolio.canvases[0];\\
  var layers = [];\\
  for (var i = 0; i < canvas.layers.length; i++) layers.push(canvas.layers[i]);\\
  var count = layers.length;\\
  var exported = [];\\
  for (var si = 0; si < count; si++) {\\
    for (var li = 0; li < count; li++) layers[li].visible = (li === si);\\
    exported.push(layers[si].name);\\
  }\\
  return JSON.stringify({ count: count, exported: exported });\\
})()';

var layerInfo = JSON.parse(og.evaluateJavascript(exportCode));

for (var ei = 0; ei < layerInfo.count; ei++) {
  // Set visibility: only layer ei visible
  var visCode = '(function() { var ls = document.portfolio.canvases[0].layers; for (var i = 0; i < ls.length; i++) ls[i].visible = (i === ' + ei + '); return "ok"; })()';
  og.evaluateJavascript(visCode);
  delay(0.3);

  var pad = (ei + 1 < 10) ? "0" + (ei + 1) : "" + (ei + 1);
  var exportPath = ${JSON.stringify(opts.exportDir ?? "")} + "/slide-" + pad + ".${ext}";
  app.doShellScript('osascript -e \\'tell application "OmniGraffle" to export front document scope current canvas as "${fmt}" to POSIX file "' + exportPath + '" with properties {resolution:2.0, draws background:false}\\'');
}

// Restore: show all layers
og.evaluateJavascript('(function() { var ls = document.portfolio.canvases[0].layers; for (var i = 0; i < ls.length; i++) ls[i].visible = true; return "ok"; })()');

result = result + "|exported:" + layerInfo.count;
`;
  }

  return `
var og = Application("OmniGraffle");
og.activate(); delay(0.5);
og.Document().make(); delay(1);
var data = ${omniPayload};
var result = og.evaluateJavascript("(" + ${JSON.stringify(omniFunc)} + ")(" + JSON.stringify(data) + ")");

delay(0.3);
var saveDir = ${JSON.stringify(opts.savePath ?? "/tmp")};
var savePath = saveDir + "/" + ${JSON.stringify(opts.title.replace(/[^a-zA-Z0-9_\- ]/g, ""))} + ".graffle";
og.documents[0].save({ in: Path(savePath) });
delay(0.3);
og.documents[0].close({ saving: "no" });
delay(0.3);
og.open(Path(savePath));

${exportScript}
result;
`;
}
