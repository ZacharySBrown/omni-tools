#!/bin/bash
#
# e2e-presentation-smoke.sh — Quick E2E smoke test for presentation bridge.
#
# Tests:
#   1. buildSlideScript → single slide with 3 nodes, 2 connections
#   2. buildDeckScript  → 2-slide deck with highlight/dim states
#
# Verifies: OmniGraffle renders, readback matches expected shapes/connections/layers.
#
# Prerequisites: macOS with OmniGraffle, project built (npm run build)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="/tmp/presentation-smoke-$(date +%s)"

mkdir -p "$OUTPUT_DIR"
export DIAGRAMMER_PRESETS_DIR="$PROJECT_DIR/presets"

PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc (got $actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

close_untitled() {
  osascript -l JavaScript -e '
    var og = Application("OmniGraffle");
    for (var i = og.documents.length - 1; i >= 0; i--) {
      if (og.documents[i].name().indexOf("Untitled") >= 0) {
        og.close(og.documents[i], { saving: "no" });
      }
    }
  ' 2>/dev/null || true
}

# Write layer-aware readback JXA script to a temp file
READBACK_JXA="$OUTPUT_DIR/layer-readback.js"
cat > "$READBACK_JXA" << 'READBACK_EOF'
function run() {
  var og = Application("OmniGraffle");
  var code = '(function() {\
    function colorToHex(c) {\
      if (!c) return null;\
      try {\
        var r = Math.round(c.red * 255);\
        var g = Math.round(c.green * 255);\
        var b = Math.round(c.blue * 255);\
        var hex = "#";\
        hex += (r < 16 ? "0" : "") + r.toString(16);\
        hex += (g < 16 ? "0" : "") + g.toString(16);\
        hex += (b < 16 ? "0" : "") + b.toString(16);\
        return hex.toUpperCase();\
      } catch(e) { return null; }\
    }\
    var canvas = document.portfolio.canvases[0];\
    var result = {\
      canvasName: canvas.name,\
      canvasSize: { w: Math.round(canvas.size.width), h: Math.round(canvas.size.height) },\
      layerCount: canvas.layers.length,\
      layers: [],\
      totalShapes: 0,\
      totalLines: 0\
    };\
    for (var li = 0; li < canvas.layers.length; li++) {\
      var layer = canvas.layers[li];\
      var layerData = { name: layer.name, visible: layer.visible, shapes: [], lines: [] };\
      for (var gi = 0; gi < layer.graphics.length; gi++) {\
        var g = layer.graphics[gi];\
        var geo = g.geometry;\
        if (g instanceof Line) {\
          layerData.lines.push({\
            source: g.head ? (g.head.name || "") : "",\
            destination: g.tail ? (g.tail.name || "") : "",\
            strokeThickness: g.strokeThickness\
          });\
          result.totalLines++;\
        } else if (g instanceof Shape) {\
          var role = null;\
          var state = null;\
          try { role = g.userData["role"]; } catch(e) {}\
          try { state = g.userData["state"]; } catch(e) {}\
          layerData.shapes.push({\
            name: g.name || "",\
            text: "" + (g.text || ""),\
            fillColor: colorToHex(g.fillColor),\
            strokeThickness: g.strokeThickness,\
            role: role,\
            state: state,\
            geo: { x: Math.round(geo.x), y: Math.round(geo.y), w: Math.round(geo.width), h: Math.round(geo.height) }\
          });\
          result.totalShapes++;\
        }\
      }\
      result.layers.push(layerData);\
    }\
    return JSON.stringify(result, null, 2);\
  })()';
  return og.evaluateJavascript(code);
}
READBACK_EOF

echo "============================================"
echo "Presentation Bridge E2E Smoke Test"
echo "============================================"
echo ""

# ─── Test 1: Single Slide ─────────────────────────────────────────
echo "TEST 1: buildSlideScript — single slide, 3 nodes, 2 connections"
echo "---"

node -e "
const path = require('path');
const fs = require('fs');
const { buildSlideScript } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'presentation.js'));
const { loadPreset } = require(path.join('$PROJECT_DIR', 'dist', 'styles', 'loader.js'));
const { runOmniJSFile } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'execute.js'));

const preset = loadPreset('illustrated-technical');
const slide = {
  title: 'Smoke Test Slide',
  canvas_name: 'Slide 1',
  nodes: [
    { id: 'input', label: 'Input', role: 'input', shape: 'rounded_rectangle', state: 'normal', x: 100, y: 50 },
    { id: 'encoder', label: 'Encoder', role: 'encoder', shape: 'rounded_rectangle', state: 'normal', x: 100, y: 200 },
    { id: 'output', label: 'Output', role: 'output', shape: 'rounded_rectangle', state: 'normal', x: 100, y: 350 },
  ],
  connections: [
    { from: 'input', to: 'encoder', style: 'default', state: 'normal' },
    { from: 'encoder', to: 'output', style: 'default', state: 'normal' },
  ],
  annotations: [],
  layout: 'manual',
  preset,
};

const script = buildSlideScript({ slide, exportPath: '$OUTPUT_DIR/slide-test.png', exportFormat: 'PNG' });
fs.writeFileSync('$OUTPUT_DIR/slide-script.js', script);
console.log('  Script generated');

const result = runOmniJSFile(script);
if (result.success) {
  console.log('  Bridge result: ' + result.output);
} else {
  console.error('  Bridge ERROR: ' + result.error);
  process.exit(1);
}
"

sleep 1

# Readback
SLIDE_JSON=$(osascript -l JavaScript "$READBACK_JXA" 2>/dev/null)

echo "$SLIDE_JSON" > "$OUTPUT_DIR/slide-readback.json"

SLIDE_SHAPES=$(echo "$SLIDE_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.totalShapes)")
SLIDE_LINES=$(echo "$SLIDE_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.totalLines)")
SLIDE_LAYERS=$(echo "$SLIDE_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.layerCount)")
SLIDE_CANVAS=$(echo "$SLIDE_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.canvasName)")

check "canvas name" "Slide 1" "$SLIDE_CANVAS"
check "shape count" "3" "$SLIDE_SHAPES"
check "line count" "2" "$SLIDE_LINES"
check "layer count" "1" "$SLIDE_LAYERS"
check "export PNG exists" "true" "$([ -f "$OUTPUT_DIR/slide-test.png" ] && echo true || echo false)"

# Check role userData
HAS_ROLES=$(echo "$SLIDE_JSON" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const roles = d.layers[0].shapes.map(s => s.role).filter(Boolean);
console.log(roles.length >= 3 ? 'true' : 'false');
")
check "shapes have role userData" "true" "$HAS_ROLES"

close_untitled
sleep 1

echo ""

# ─── Test 2: Two-Slide Deck ──────────────────────────────────────
echo "TEST 2: buildDeckScript — 2-slide deck, highlight + dim states"
echo "---"

node -e "
const path = require('path');
const fs = require('fs');
const { buildDeckScript } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'presentation.js'));
const { loadPreset } = require(path.join('$PROJECT_DIR', 'dist', 'styles', 'loader.js'));
const { runOmniJSFile } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'execute.js'));

const preset = loadPreset('illustrated-technical');

const slides = [
  {
    title: 'Overview',
    canvas_name: 'Slide 1',
    nodes: [
      { id: 'a', label: 'Input', role: 'input', shape: 'rounded_rectangle', state: 'normal', x: 100, y: 50 },
      { id: 'b', label: 'Process', role: 'encoder', shape: 'rounded_rectangle', state: 'normal', x: 100, y: 200 },
      { id: 'c', label: 'Output', role: 'output', shape: 'rounded_rectangle', state: 'normal', x: 100, y: 350 },
    ],
    connections: [
      { from: 'a', to: 'b', style: 'default', state: 'normal' },
      { from: 'b', to: 'c', style: 'default', state: 'normal' },
    ],
    annotations: [],
    layout: 'manual',
    preset,
  },
  {
    title: 'Focus on Input',
    canvas_name: 'Slide 2',
    nodes: [
      { id: 'a', label: 'Input', role: 'input', shape: 'rounded_rectangle', state: 'highlighted', x: 100, y: 50 },
      { id: 'b', label: 'Process', role: 'encoder', shape: 'rounded_rectangle', state: 'dimmed', x: 100, y: 200 },
      { id: 'c', label: 'Output', role: 'output', shape: 'rounded_rectangle', state: 'dimmed', x: 100, y: 350 },
    ],
    connections: [
      { from: 'a', to: 'b', style: 'default', state: 'normal' },
      { from: 'b', to: 'c', style: 'default', state: 'dimmed' },
    ],
    annotations: [{ text: 'Start here', x: 350, y: 50, style: 'callout' }],
    layout: 'manual',
    preset,
  },
];

const script = buildDeckScript({
  title: 'Smoke Test Deck',
  slides,
  exportDir: '$OUTPUT_DIR/deck',
  exportFormat: 'PNG',
});
fs.writeFileSync('$OUTPUT_DIR/deck-script.js', script);
console.log('  Script generated');

// Create export dir
fs.mkdirSync('$OUTPUT_DIR/deck', { recursive: true });

const result = runOmniJSFile(script);
if (result.success) {
  console.log('  Bridge result: ' + result.output);
} else {
  console.error('  Bridge ERROR: ' + result.error);
  process.exit(1);
}
"

sleep 1

# Readback
DECK_JSON=$(osascript -l JavaScript "$READBACK_JXA" 2>/dev/null)

echo "$DECK_JSON" > "$OUTPUT_DIR/deck-readback.json"

DECK_CANVAS=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.canvasName)")
DECK_LAYERS=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.layerCount)")
DECK_TOTAL_SHAPES=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.totalShapes)")

check "deck canvas name" "Smoke Test Deck" "$DECK_CANVAS"
check "deck layer count" "2" "$DECK_LAYERS"

# OmniGraffle layer order: index 0 = topmost (last created), index N-1 = bottommost (first created)
# So: layers[0] = "Focus on Input" (slide 2, created via newLayer), layers[1] = "Overview" (slide 1, base layer)
# Also: canvas.connect() puts ALL lines on the base layer, not per-layer. This is OmniGraffle behavior.

# Top layer = Focus on Input (slide 2): 3 shapes + 1 annotation = 4
TOP_NAME=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.layers[0].name)")
TOP_SHAPES=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.layers[0].shapes.length)")

check "top layer name (slide 2)" "Focus on Input" "$TOP_NAME"
check "top layer shapes (3 nodes + 1 annotation)" "4" "$TOP_SHAPES"

# Bottom layer = Overview (slide 1): 3 shapes
BOT_NAME=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.layers[1].name)")
BOT_SHAPES=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.layers[1].shapes.length)")

check "bottom layer name (slide 1)" "Overview" "$BOT_NAME"
check "bottom layer shapes" "3" "$BOT_SHAPES"

# Total lines across all layers (canvas.connect puts them on base layer)
TOTAL_LINES=$(echo "$DECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.totalLines)")
check "total connections" "4" "$TOTAL_LINES"

# Verify highlighted node has thicker stroke (on top layer = slide 2)
HIGHLIGHT_STROKE=$(echo "$DECK_JSON" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const hl = d.layers[0].shapes.find(s => s.state === 'highlighted');
console.log(hl ? hl.strokeThickness : 'missing');
")
check "highlighted node stroke > 2" "true" "$(node -e "console.log($HIGHLIGHT_STROKE > 2)")"

# Verify dimmed node present (on top layer = slide 2)
DIM_STATE=$(echo "$DECK_JSON" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const dim = d.layers[0].shapes.find(s => s.state === 'dimmed');
console.log(dim ? 'found' : 'missing');
")
check "dimmed node present" "found" "$DIM_STATE"

# Check exported slide PNGs
check "slide-01.png exported" "true" "$([ -f "$OUTPUT_DIR/deck/slide-01.png" ] && echo true || echo false)"
check "slide-02.png exported" "true" "$([ -f "$OUTPUT_DIR/deck/slide-02.png" ] && echo true || echo false)"

# Verify only first layer is visible by default (before export toggled them)
# After export, all layers restored to visible — check that
ALL_VIS=$(echo "$DECK_JSON" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const allVis = d.layers.every(l => l.visible);
console.log(allVis ? 'true' : 'false');
")
# Note: after export, the script restores all layers visible
check "all layers visible after export" "true" "$ALL_VIS"

close_untitled

echo ""
echo "============================================"
echo "Results: $PASS passed, $FAIL failed"
echo "Artifacts in: $OUTPUT_DIR/"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
