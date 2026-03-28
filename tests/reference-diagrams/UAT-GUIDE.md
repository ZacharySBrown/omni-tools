# Calibration UAT Guide

Walk through each step together. Claude runs the commands, you verify visually in OmniGraffle and confirm before moving on.

## Prerequisites

- OmniGraffle is running
- Close all untitled documents in OmniGraffle (File > Close on each)
- Project is built: `npm run build`
- Permissions granted: Automation (VS Code -> OmniGraffle), Screen Recording
- Preset directory configured: `export DIAGRAMMER_PRESETS_DIR="$(pwd)/../../presets"` (run from `tests/reference-diagrams/`)

## Test 1: Create Diagram (01-encoder-block)

**What it does:** Renders the Transformer Encoder Block diagram from JSON spec.

```bash
cd tests/reference-diagrams
node -e "
  const fs = require('fs');
  const path = require('path');
  const spec = JSON.parse(fs.readFileSync('01-encoder-block.json', 'utf8'));
  const { buildDiagramScript } = require(path.join('../../dist/bridge/diagram.js'));
  const { loadPreset } = require(path.join('../../dist/styles/loader.js'));
  const { runOmniJSFile } = require(path.join('../../dist/bridge/execute.js'));

  (async () => {
    const preset = await loadPreset('illustrated-technical');
    const script = buildDiagramScript({
      title: spec.title,
      nodes: spec.nodes,
      connections: spec.connections,
      preset,
      canvasType: 'diagram',
      layout: 'manual',
    });
    fs.writeFileSync('snapshots/01-encoder-block-generated.js', script);
    const result = runOmniJSFile(script);
    console.log(result.success ? 'OK: ' + result.output : 'FAIL: ' + result.error);
  })();
"
```

**You verify:**
- [ ] New document appeared in OmniGraffle
- [ ] Shows encoder block: Self-Attention (tan), Feed Forward (blue), input vectors (green), output vectors (pink)
- [ ] ENCODER label at top-left
- [ ] 9 connections visible (arrows between layers)
- [ ] Canvas title is "Transformer Encoder Block"

## Test 2: Readback

**What it does:** Extracts structural data from the frontmost document.

**Before running:** Make sure the encoder-block document from Test 1 is the frontmost window in OmniGraffle.

```bash
osascript readback.js > snapshots/01-encoder-block-snapshot.json
node -e "
  const d = JSON.parse(require('fs').readFileSync('snapshots/01-encoder-block-snapshot.json', 'utf8'));
  const c = d.canvases[0];
  console.log('Document:', d.document.name);
  console.log('Shapes:', c.shapes.length, 'Lines:', c.lines.length);
  console.log('Canvas:', c.size.width + 'x' + c.size.height);
  console.log('Shape names:', c.shapes.map(s => s.name).join(', '));
"
```

**You verify:**
- [ ] Document name matches the encoder-block window
- [ ] 13 shapes, 9 lines
- [ ] Canvas ~1162x762
- [ ] Shape names include: encoder_label, encoder_bg, ff_layer, sa_layer, x1-x3, z1-z3, word1-word3

## Test 3: Export PNG

**What it does:** Exports the frontmost document to PNG via OmniGraffle's native export.

**Before running:** Encoder-block document is still frontmost.

```bash
node -e "
  const path = require('path');
  const { buildExportScript } = require(path.join('../../dist/bridge/export.js'));
  const { runOmniJSFile } = require(path.join('../../dist/bridge/execute.js'));
  const script = buildExportScript({
    outputPath: path.resolve('snapshots/01-encoder-block-export.png'),
    format: 'png',
    dpi: 144,
  });
  const result = runOmniJSFile(script);
  console.log(result.success ? 'OK: ' + result.output : 'FAIL: ' + result.error);
"
```

**You verify:**
- [ ] File exists: `snapshots/01-encoder-block-export.png`
- [ ] Open it — matches what you see in OmniGraffle

## Test 4: Screenshot Capture

**What it does:** Captures a screenshot of the OmniGraffle window.

**Before running:** Encoder-block document is frontmost. Zoom/scroll so the full diagram is visible.

```bash
WIN_ID=$(osascript -e 'tell application "OmniGraffle" to return id of front window')
echo "Window ID: $WIN_ID"
screencapture -l "$WIN_ID" snapshots/01-encoder-block-screenshot.png
echo "Saved screenshot"
```

**You verify:**
- [ ] File exists: `snapshots/01-encoder-block-screenshot.png`
- [ ] Shows OmniGraffle window with the full diagram visible

## Test 5: Snapshot Comparison

**What it does:** Compares the current snapshot against a baseline.

```bash
# First run: save current as baseline
cp snapshots/01-encoder-block-snapshot.json snapshots/01-encoder-block-baseline.json
echo "Baseline saved"

# Then compare (should show zero diffs since it's the same file)
node compare-snapshots.cjs \
  snapshots/01-encoder-block-baseline.json \
  snapshots/01-encoder-block-snapshot.json
```

**You verify:**
- [ ] "No differences found" output

## Test 6: Create Diagram (02-self-attention)

**Before running:** Close the encoder-block document in OmniGraffle.

```bash
node -e "
  const fs = require('fs');
  const path = require('path');
  const spec = JSON.parse(fs.readFileSync('02-self-attention.json', 'utf8'));
  const { buildDiagramScript } = require(path.join('../../dist/bridge/diagram.js'));
  const { loadPreset } = require(path.join('../../dist/styles/loader.js'));
  const { runOmniJSFile } = require(path.join('../../dist/bridge/execute.js'));

  (async () => {
    const preset = await loadPreset('illustrated-technical');
    const script = buildDiagramScript({
      title: spec.title,
      nodes: spec.nodes,
      connections: spec.connections,
      preset,
      canvasType: 'diagram',
      layout: 'manual',
    });
    fs.writeFileSync('snapshots/02-self-attention-generated.js', script);
    const result = runOmniJSFile(script);
    console.log(result.success ? 'OK: ' + result.output : 'FAIL: ' + result.error);
  })();
"
```

**You verify:**
- [ ] Self-attention diagram rendered with Q/K/V matrices, score computation, softmax, weighted values
- [ ] Connections flow correctly through the attention pipeline

Then readback + export + screenshot (same pattern as Tests 2-4, substituting `02-self-attention`).

## Test 7: Create Diagram (03-encoder-decoder)

Same pattern. Close previous document first.

```bash
node -e "
  const fs = require('fs');
  const path = require('path');
  const spec = JSON.parse(fs.readFileSync('03-encoder-decoder.json', 'utf8'));
  const { buildDiagramScript } = require(path.join('../../dist/bridge/diagram.js'));
  const { loadPreset } = require(path.join('../../dist/styles/loader.js'));
  const { runOmniJSFile } = require(path.join('../../dist/bridge/execute.js'));

  (async () => {
    const preset = await loadPreset('illustrated-technical');
    const script = buildDiagramScript({
      title: spec.title,
      nodes: spec.nodes,
      connections: spec.connections,
      preset,
      canvasType: 'diagram',
      layout: spec.layout || 'manual',
    });
    fs.writeFileSync('snapshots/03-encoder-decoder-generated.js', script);
    const result = runOmniJSFile(script);
    console.log(result.success ? 'OK: ' + result.output : 'FAIL: ' + result.error);
  })();
"
```

**You verify:**
- [ ] Encoder-decoder architecture visible

## Test 8: Create Diagram (04-cross-prompt-flags)

Same pattern. Close previous document first.

```bash
node -e "
  const fs = require('fs');
  const path = require('path');
  const spec = JSON.parse(fs.readFileSync('04-cross-prompt-flags.json', 'utf8'));
  const { buildDiagramScript } = require(path.join('../../dist/bridge/diagram.js'));
  const { loadPreset } = require(path.join('../../dist/styles/loader.js'));
  const { runOmniJSFile } = require(path.join('../../dist/bridge/execute.js'));

  (async () => {
    const preset = await loadPreset('illustrated-technical');
    const script = buildDiagramScript({
      title: spec.title,
      nodes: spec.nodes,
      connections: spec.connections,
      preset,
      canvasType: 'diagram',
      layout: spec.layout || 'manual',
    });
    fs.writeFileSync('snapshots/04-cross-prompt-flags-generated.js', script);
    const result = runOmniJSFile(script);
    console.log(result.success ? 'OK: ' + result.output : 'FAIL: ' + result.error);
  })();
"
```

**You verify:**
- [ ] Cross-attention diagram with prompt flags rendered

## Test 9: Review Diagram

**What it does:** Runs automated quality checks on the frontmost diagram.

**Before running:** Have any of the test diagrams open as frontmost.

```bash
node -e "
  const path = require('path');
  const { readDiagramState, checkTextOverflow, checkShapeOverlap, checkTextContrast, checkInconsistentSizing } = require(path.join('../../dist/bridge/review.js'));
  const { runOmniJSFile } = require(path.join('../../dist/bridge/execute.js'));

  const state = readDiagramState(runOmniJSFile);
  if (!state) { console.log('FAIL: Could not read diagram'); process.exit(1); }

  const shapes = state.canvases[0].shapes;
  const findings = [
    ...checkTextOverflow(shapes),
    ...checkShapeOverlap(shapes),
    ...checkTextContrast(shapes),
    ...checkInconsistentSizing(shapes),
  ];

  console.log('Document:', state.document.name);
  console.log('Findings:', findings.length);
  findings.forEach(f => console.log('  [' + f.severity + '] ' + f.checkId + ': ' + f.message));
"
```

**You verify:**
- [ ] Reads the correct document
- [ ] Any findings make sense (no false positives on well-designed diagrams)

## Cleanup

Close all untitled test documents in OmniGraffle when done.

## Artifacts Produced

After all tests pass, `snapshots/` should contain for each diagram:
- `{name}-generated.js` — JXA script (debug artifact)
- `{name}-snapshot.json` — structural readback
- `{name}-baseline.json` — baseline for regression (copy of snapshot)
- `{name}-export.png` — clean PNG export
- `{name}-screenshot.png` — window screenshot
