#!/bin/bash
#
# run-calibration.sh — Generate all reference diagrams in OmniGraffle,
# read back their geometries, and save snapshots for comparison.
#
# Prerequisites:
#   - macOS with OmniGraffle Pro 7.12+
#   - Automation permission granted to Terminal
#   - Project built: npm run build
#
# Usage:
#   cd tests/reference-diagrams
#   ./run-calibration.sh [diagram_number]
#
#   ./run-calibration.sh        # Run all 3
#   ./run-calibration.sh 1      # Run only encoder-block
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/snapshots"
READBACK="$SCRIPT_DIR/readback.js"

mkdir -p "$OUTPUT_DIR"

# Point preset loader at the project's presets directory
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
)

run_diagram() {
  local name="$1"
  local spec_file="$SCRIPT_DIR/${name}.json"
  local snapshot_file="$OUTPUT_DIR/${name}-snapshot.json"

  if [ ! -f "$spec_file" ]; then
    echo "ERROR: Spec file not found: $spec_file"
    return 1
  fi

  echo "============================================"
  echo "Generating: $name"
  echo "============================================"

  # Use the MCP tool's bridge directly via a small Node script
  node -e "
    const fs = require('fs');
    const path = require('path');
    const spec = JSON.parse(fs.readFileSync('$spec_file', 'utf8'));

    // Import the bridge modules
    const { buildDiagramScript } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'diagram.js'));
    const { loadPreset } = require(path.join('$PROJECT_DIR', 'dist', 'styles', 'loader.js'));
    const { runOmniJSFile } = require(path.join('$PROJECT_DIR', 'dist', 'bridge', 'execute.js'));

    async function main() {
      // Load the style preset
      const preset = await loadPreset(spec.style_preset || 'illustrated-technical');
      if (!preset) {
        console.error('Failed to load preset');
        process.exit(1);
      }

      // Build the JXA script
      const script = buildDiagramScript({
        title: spec.title,
        nodes: spec.nodes,
        connections: spec.connections,
        preset: preset,
        canvasType: spec.canvas_type || 'diagram',
        layout: spec.layout || 'manual',
      });

      // Write script for inspection
      const scriptPath = '$OUTPUT_DIR/${name}-generated.js';
      fs.writeFileSync(scriptPath, script);
      console.log('  Generated JXA script: ' + scriptPath);

      // Execute in OmniGraffle
      console.log('  Executing in OmniGraffle...');
      const result = runOmniJSFile(script);
      console.log('  Bridge result: ' + result);
    }

    main().catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  "

  # Wait briefly for OmniGraffle to finish rendering
  sleep 2

  # Read back the document state
  echo "  Reading back geometries..."
  osascript "$READBACK" > "$snapshot_file" 2>/dev/null || {
    echo "  WARNING: Readback failed (is OmniGraffle open with the document?)"
    return 1
  }

  echo "  Snapshot saved: $snapshot_file"

  # Quick summary
  local shape_count
  shape_count=$(node -e "
    const d = JSON.parse(require('fs').readFileSync('$snapshot_file', 'utf8'));
    const c = d.canvases[0];
    console.log('  Shapes: ' + c.shapes.length + ', Lines: ' + c.lines.length);
    console.log('  Canvas: ' + c.size.width + 'x' + c.size.height);
  " 2>/dev/null || echo "  (Could not parse snapshot)")

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
echo "Snapshots saved in: $OUTPUT_DIR/"
echo ""
echo "Next steps:"
echo "  1. Visually inspect diagrams in OmniGraffle"
echo "  2. Compare snapshots against reference images in originals/"
echo "  3. Adjust preset values or node coordinates as needed"
echo "  4. Re-run to verify changes"
echo "============================================"
