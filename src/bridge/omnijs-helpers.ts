/**
 * Shared OmniGraffle Omni Automation code fragments.
 *
 * Each function returns a JS source string to be embedded inside
 * an evaluateJavascript() call. These run INSIDE OmniGraffle, not
 * in Node.js — they use the Omni Automation API (Color.RGB, etc).
 */

/** Color conversion: hex string → Color.RGB */
export function emitColorHelpers(): string {
  return `
  function hexToRGB(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, 1);
  }

  function hexToRGBA(hex, alpha) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    return Color.RGB(r, g, b, alpha);
  }

  function darkenHex(hex, factor) {
    var r = Math.round(parseInt(hex.slice(1,3), 16) * factor);
    var g = Math.round(parseInt(hex.slice(3,5), 16) * factor);
    var b = Math.round(parseInt(hex.slice(5,7), 16) * factor);
    return Color.RGB(r/255, g/255, b/255, 1);
  }

  function darkenHexAlpha(hex, factor, alpha) {
    var r = Math.round(parseInt(hex.slice(1,3), 16) * factor);
    var g = Math.round(parseInt(hex.slice(3,5), 16) * factor);
    var b = Math.round(parseInt(hex.slice(5,7), 16) * factor);
    return Color.RGB(r/255, g/255, b/255, alpha);
  }
`;
}

/** OmniGraffle shape name mapping from our schema names */
export function emitShapeMap(): string {
  return `
  var ogShapeMap = {
    "rectangle": "Rectangle",
    "rounded_rectangle": "RoundedRectangle",
    "diamond": "Diamond",
    "circle": "Circle",
    "token_cell": "RoundedRectangle",
    "pill": "RoundedRectangle",
    "annotation": "Rectangle"
  };
`;
}

/**
 * Synchronous hierarchical layout algorithm.
 *
 * Replaces canvas.layout() which is async in Omni Automation.
 * BFS rank assignment from root nodes, centered row positioning.
 *
 * Expects: `data.nodes[].id`, `data.conns[].from/to`, `shapes{}` map,
 *          `S.rankSep`, `S.objSep` in scope.
 */
export function emitSyncLayout(): string {
  return `
  if (data.layout !== "manual") {
    var children = {};
    var parents = {};
    var allIds = [];
    for (var ni = 0; ni < data.nodes.length; ni++) {
      var nid = data.nodes[ni].id;
      allIds.push(nid);
      children[nid] = [];
      parents[nid] = [];
    }
    for (var ci = 0; ci < data.conns.length; ci++) {
      children[data.conns[ci].from].push(data.conns[ci].to);
      parents[data.conns[ci].to].push(data.conns[ci].from);
    }

    var rank = {};
    var queue = [];
    for (var ni = 0; ni < allIds.length; ni++) {
      if (parents[allIds[ni]].length === 0) {
        rank[allIds[ni]] = 0;
        queue.push(allIds[ni]);
      }
    }
    if (queue.length === 0) {
      rank[allIds[0]] = 0;
      queue.push(allIds[0]);
    }
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      var kids = children[cur];
      for (var ki = 0; ki < kids.length; ki++) {
        var newRank = rank[cur] + 1;
        if (rank[kids[ki]] === undefined || rank[kids[ki]] < newRank) {
          rank[kids[ki]] = newRank;
        }
        if (queue.indexOf(kids[ki]) === -1) {
          queue.push(kids[ki]);
        }
      }
    }

    var ranks = {};
    var maxRank = 0;
    for (var ni = 0; ni < allIds.length; ni++) {
      var r = rank[allIds[ni]] || 0;
      if (!ranks[r]) ranks[r] = [];
      ranks[r].push(allIds[ni]);
      if (r > maxRank) maxRank = r;
    }

    var layoutPad = 60;
    var rankSep = S.rankSep;
    var objSep = S.objSep;

    var rowWidths = [];
    var maxRowW = 0;
    for (var r = 0; r <= maxRank; r++) {
      var row = ranks[r] || [];
      var totalW = 0;
      for (var ri = 0; ri < row.length; ri++) {
        totalW += shapes[row[ri]].geometry.width;
        if (ri > 0) totalW += objSep;
      }
      rowWidths.push(totalW);
      if (totalW > maxRowW) maxRowW = totalW;
    }

    var startY = layoutPad;
    for (var r = 0; r <= maxRank; r++) {
      var row = ranks[r] || [];
      var curX = layoutPad + (maxRowW - rowWidths[r]) / 2;
      var maxH = 0;
      for (var ri = 0; ri < row.length; ri++) {
        var sh = shapes[row[ri]];
        var geo = sh.geometry;
        sh.geometry = new Rect(curX, startY, geo.width, geo.height);
        curX += geo.width + objSep;
        if (geo.height > maxH) maxH = geo.height;
      }
      startY += maxH + rankSep;
    }
  }
`;
}

/**
 * Synchronous hierarchical layout as a callable function.
 *
 * Unlike emitSyncLayout() which inlines code referencing `data.nodes` etc,
 * this emits a named function `doSyncLayout(nodes, conns, shapes, S, layout)`
 * that can be called with any variable names — needed for the presentation
 * bridge where per-slide data lives in different variables.
 */
export function emitSyncLayoutFunc(): string {
  return `
  function doSyncLayout(nodes, conns, shapes, S, layout) {
    if (layout === "manual") return;

    var children = {};
    var parents = {};
    var allIds = [];
    for (var ni = 0; ni < nodes.length; ni++) {
      var nid = nodes[ni].id;
      allIds.push(nid);
      children[nid] = [];
      parents[nid] = [];
    }
    for (var ci = 0; ci < conns.length; ci++) {
      children[conns[ci].from].push(conns[ci].to);
      parents[conns[ci].to].push(conns[ci].from);
    }

    var rank = {};
    var queue = [];
    for (var ni = 0; ni < allIds.length; ni++) {
      if (parents[allIds[ni]].length === 0) {
        rank[allIds[ni]] = 0;
        queue.push(allIds[ni]);
      }
    }
    if (queue.length === 0) {
      rank[allIds[0]] = 0;
      queue.push(allIds[0]);
    }
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      var kids = children[cur];
      for (var ki = 0; ki < kids.length; ki++) {
        var newRank = rank[cur] + 1;
        if (rank[kids[ki]] === undefined || rank[kids[ki]] < newRank) {
          rank[kids[ki]] = newRank;
        }
        if (queue.indexOf(kids[ki]) === -1) {
          queue.push(kids[ki]);
        }
      }
    }

    var ranks = {};
    var maxRank = 0;
    for (var ni = 0; ni < allIds.length; ni++) {
      var r = rank[allIds[ni]] || 0;
      if (!ranks[r]) ranks[r] = [];
      ranks[r].push(allIds[ni]);
      if (r > maxRank) maxRank = r;
    }

    var layoutPad = 60;
    var rankSep = S.rankSep;
    var objSep = S.objSep;

    var rowWidths = [];
    var maxRowW = 0;
    for (var r = 0; r <= maxRank; r++) {
      var row = ranks[r] || [];
      var totalW = 0;
      for (var ri = 0; ri < row.length; ri++) {
        totalW += shapes[row[ri]].geometry.width;
        if (ri > 0) totalW += objSep;
      }
      rowWidths.push(totalW);
      if (totalW > maxRowW) maxRowW = totalW;
    }

    var startY = layoutPad;
    for (var r = 0; r <= maxRank; r++) {
      var row = ranks[r] || [];
      var curX = layoutPad + (maxRowW - rowWidths[r]) / 2;
      var maxH = 0;
      for (var ri = 0; ri < row.length; ri++) {
        var sh = shapes[row[ri]];
        var geo = sh.geometry;
        sh.geometry = new Rect(curX, startY, geo.width, geo.height);
        curX += geo.width + objSep;
        if (geo.height > maxH) maxH = geo.height;
      }
      startY += maxH + rankSep;
    }
  }
`;
}

/**
 * Canvas-fit-to-content: measure all graphics, shift to origin + padding,
 * resize canvas to fit.
 *
 * Expects `canvas` in scope.
 */
export function emitCanvasFit(): string {
  return `
  var allGraphics = canvas.graphics;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var gi = 0; gi < allGraphics.length; gi++) {
    var geo = allGraphics[gi].geometry;
    if (geo.x < minX) minX = geo.x;
    if (geo.y < minY) minY = geo.y;
    if (geo.x + geo.width > maxX) maxX = geo.x + geo.width;
    if (geo.y + geo.height > maxY) maxY = geo.y + geo.height;
  }
  var fitPad = 60;
  var dx = fitPad - minX;
  var dy = fitPad - minY;
  if (dx !== 0 || dy !== 0) {
    for (var gi = 0; gi < allGraphics.length; gi++) {
      var geo = allGraphics[gi].geometry;
      allGraphics[gi].geometry = new Rect(geo.x + dx, geo.y + dy, geo.width, geo.height);
    }
  }
  var contentW = (maxX - minX) + fitPad * 2;
  var contentH = (maxY - minY) + fitPad * 2;
  canvas.size = new Size(contentW, contentH);
`;
}
