#!/bin/bash
#
# run-calibration-with-capture.sh — Generate reference diagrams, read back
# structural data, export PNGs via OmniGraffle, and capture window screenshots.
#
# Produces three artifacts per diagram:
#   1. {name}-snapshot.json   — structural readback (shapes, geometry, colors)
#   2. {name}-export.png      — OmniGraffle native PNG export (clean, no chrome)
#   3. {name}-screenshot.png  — window screenshot (shows OmniGraffle chrome)
#   4. {name}-generated.js    — the JXA script that was executed (for debugging)
#
# Prerequisites:
#   - macOS with OmniGraffle Pro 7.12+
#   - Privacy & Security: Automation + Screen Recording granted to VS Code/Terminal
#   - Project built: npm run build
#
# Usage:
#   cd tests/reference-diagrams
#   ./run-calibration-with-capture.sh [diagram_number]
#
#   ./run-calibration-with-capture.sh        # Run all
#   ./run-calibration-with-capture.sh 1      # Run only encoder-block
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/snapshots"
READBACK="$SCRIPT_DIR/readback.js"

mkdir -p "$OUTPUT_DIR"

export DIAGRAMMER_PRESETS_DIR="$PROJECT_DIR/presets"

# Ensure project is built
if [ ! -d "$PROJECT_DIR/dist" ]; then
  echo "Building project..."
  (cd "$PROJECT_DIR" && npm run build)
fi

# Map diagram number to file
DIAGRAMS=(
  "01-encoder-block"
  "02-self-attention"
  "03-encoder-decoder"
  "04-cross-prompt-flags"
)

capture_screenshot() {
  local output_path="$1"
  # Get OmniGraffle's front window ID and capture it
  local win_id
  win_id=$(osascript -e 'tell application "OmniGraffle" to return id of front window' 2>/dev/null) || {
    echo "    WARNING: Could not get window ID for screenshot"
    return 1
  }
  screencapture -l "$win_id" "$output_path" 2>/dev/null || {
    echo "    WARNING: screencapture failed"
    return 1
  }
  echo "    Screenshot saved: $output_path"
}

run_diagram() {
  local name="$1"
  local spec_file="$SCRIPT_DIR/${name}.json"
  local snapshot_file="$OUTPUT_DIR/${name}-snapshot.json"
  local export_file="$OUTPUT_DIR/${name}-export.png"
  local screenshot_file="$OUTPUT_DIR/${name}-screenshot.png"
  local script_file="$OUTPUT_DIR/${name}-generated.js"

  if [ ! -f "$spec_file" ]; then
    echo "ERROR: Spec file not found: $spec_file"
    return 1
  fi

  echo "============================================"
  echo "Generating: $name"
  echo "============================================"

  # Step 1: Build and execute the diagram script
  node -e "
    const fs = require('fs');
    const path = require('path');
    const spec = JSON.parse(fs.readFileSync('$spec_file', 'utf8'));
    const { buildDiagramScript } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'diagram.js'));
    const { loadPreset } = require(path.join('$PROJECT_DIR', 'dist', 'styles', 'loader.js'));
    const { runOmniJSFile } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'execute.js'));

    async function main() {
      const preset = await loadPreset(spec.style_preset || 'illustrated-technical');
      if (!preset) {
        console.error('Failed to load preset');
        process.exit(1);
      }

      const script = buildDiagramScript({
        title: spec.title,
        nodes: spec.nodes,
        connections: spec.connections,
        preset: preset,
        canvasType: spec.canvas_type || 'diagram',
        layout: spec.layout || 'manual',
      });

      fs.writeFileSync('$script_file', script);
      console.log('  Generated JXA script: $script_file');

      console.log('  Executing in OmniGraffle...');
      const result = runOmniJSFile(script);
      if (result.success) {
        console.log('  Bridge result: ' + result.output);
      } else {
        console.error('  Bridge ERROR: ' + result.error);
        process.exit(1);
      }
    }

    main().catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  "

  # Wait for OmniGraffle to finish rendering
  sleep 2

  # Step 2: Find the newly created document and bring its window to front.
  # The bridge creates a new "Untitled" doc. We find it and set its window
  # as the index-0 window so readback/export/screenshot all target it.
  local doc_name
  doc_name=$(osascript -l JavaScript -e '
    var og = Application("OmniGraffle");
    og.activate();
    // Find the first Untitled window and bring it to front
    for (var i = 0; i < og.windows.length; i++) {
      var wname = og.windows[i].name();
      if (wname.indexOf("Untitled") >= 0) {
        og.windows[i].index = 1; // brings to front
        delay(0.3);
        break;
      }
    }
    og.windows[0].name();
  ' 2>/dev/null) || doc_name="unknown"
  echo "  Front window: $doc_name"

  # Zoom to fit and center view
  osascript -l JavaScript -e '
    var og = Application("OmniGraffle");
    var info = og.evaluateJavascript("JSON.stringify({ w: document.portfolio.canvases[0].size.width, h: document.portfolio.canvases[0].size.height })");
    var cs = JSON.parse(info);
    var zoom = Math.min(800 / cs.w, 600 / cs.h, 1.0);
    zoom = Math.max(zoom, 0.25);
    og.windows[0].zoom = zoom;
    og.evaluateJavascript("document.windows[0].centerVisiblePoint = new Point(" + (cs.w/2) + "," + (cs.h/2) + ")");
  ' 2>/dev/null || echo "  WARNING: Could not set zoom"

  sleep 0.5

  # Step 3: Read back structural data (from the frontmost document)
  echo "  Reading back geometries..."
  osascript "$READBACK" > "$snapshot_file" 2>/dev/null || {
    echo "  WARNING: Readback failed (is OmniGraffle open with the document?)"
    return 1
  }
  echo "  Snapshot saved: $snapshot_file"

  # Verify readback matches expectations
  node -e "
    const d = JSON.parse(require('fs').readFileSync('$snapshot_file', 'utf8'));
    const c = d.canvases[0];
    console.log('  Readback: ' + c.shapes.length + ' shapes, ' + c.lines.length + ' lines, canvas ' + c.size.width + 'x' + c.size.height);
  " 2>/dev/null || true

  # Step 4: Export PNG via OmniGraffle native export
  echo "  Exporting PNG..."
  node -e "
    const path = require('path');
    const { buildExportScript } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'export.js'));
    const { runOmniJSFile } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'execute.js'));

    const script = buildExportScript({
      outputPath: '$export_file',
      format: 'png',
    });

    const result = runOmniJSFile(script);
    if (result.success) {
      console.log('  Export saved: $export_file');
    } else {
      console.error('  Export ERROR: ' + result.error);
    }
  "

  # Step 5: Capture window screenshot
  echo "  Capturing screenshot..."
  capture_screenshot "$screenshot_file"

  # Summary
  node -e "
    const d = JSON.parse(require('fs').readFileSync('$snapshot_file', 'utf8'));
    const c = d.canvases[0];
    console.log('  Readback doc: ' + d.document.name);
    console.log('  Shapes: ' + c.shapes.length + ', Lines: ' + c.lines.length);
    console.log('  Canvas: ' + c.size.width + 'x' + c.size.height);
  " 2>/dev/null || echo "  (Could not parse snapshot)"

  # Step 6: Close the generated document to keep things clean
  osascript -l JavaScript -e '
    var og = Application("OmniGraffle");
    for (var i = og.documents.length - 1; i >= 0; i--) {
      if (og.documents[i].name().indexOf("Untitled") >= 0) {
        og.close(og.documents[i], { saving: "no" });
      }
    }
  ' 2>/dev/null || true

  echo ""
}

# Determine which diagrams to run
if [ "${1:-}" != "" ]; then
  idx=$(( $1 - 1 ))
  if [ $idx -lt 0 ] || [ $idx -ge ${#DIAGRAMS[@]} ]; then
    echo "Invalid diagram number. Use 1-${#DIAGRAMS[@]}"
    exit 1
  fi
  run_diagram "${DIAGRAMS[$idx]}"
else
  for diag in "${DIAGRAMS[@]}"; do
    run_diagram "$diag"
  done
fi

echo "============================================"
echo "Calibration complete!"
echo "Artifacts in: $OUTPUT_DIR/"
echo ""
echo "Per diagram:"
echo "  *-snapshot.json    Structural readback"
echo "  *-export.png       Native OmniGraffle export"
echo "  *-screenshot.png   Window screenshot"
echo "  *-generated.js     JXA script (debug)"
echo ""
echo "Compare snapshots:"
echo "  node compare-snapshots.cjs snapshots/01-baseline.json snapshots/01-snapshot.json"
echo "============================================"
