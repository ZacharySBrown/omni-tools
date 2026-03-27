#!/usr/bin/env node
//
// compare-snapshots.js — Compare two readback snapshots and report diffs
// in geometry, colors, and structure.
//
// Usage:
//   node compare-snapshots.js snapshots/01-baseline.json snapshots/01-current.json
//   node compare-snapshots.js snapshots/01-baseline.json snapshots/01-current.json --tolerance 5
//

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node compare-snapshots.js <baseline.json> <current.json> [--tolerance N]"
  );
  process.exit(1);
}

const toleranceIdx = args.indexOf("--tolerance");
const tolerance = toleranceIdx >= 0 ? parseFloat(args[toleranceIdx + 1]) : 2.0;

const baseline = JSON.parse(fs.readFileSync(args[0], "utf8"));
const current = JSON.parse(fs.readFileSync(args[1], "utf8"));

let diffs = 0;

function report(path, expected, actual) {
  diffs++;
  console.log(`  DIFF ${path}: expected=${expected}, actual=${actual}`);
}

function withinTolerance(a, b) {
  return Math.abs(a - b) <= tolerance;
}

// Compare canvas-level
for (let ci = 0; ci < baseline.canvases.length; ci++) {
  const bc = baseline.canvases[ci];
  const cc = current.canvases[ci];

  if (!cc) {
    report(`canvas[${ci}]`, bc.name, "MISSING");
    continue;
  }

  const prefix = `canvas[${ci}]`;

  if (!withinTolerance(bc.size.width, cc.size.width))
    report(`${prefix}.size.width`, bc.size.width, cc.size.width);
  if (!withinTolerance(bc.size.height, cc.size.height))
    report(`${prefix}.size.height`, bc.size.height, cc.size.height);

  // Index shapes by name for comparison
  const baseShapes = new Map(bc.shapes.map((s) => [s.name, s]));
  const currShapes = new Map(cc.shapes.map((s) => [s.name, s]));

  for (const [name, bs] of baseShapes) {
    const cs = currShapes.get(name);
    if (!cs) {
      report(`${prefix}.shape[${name}]`, "present", "MISSING");
      continue;
    }

    const sp = `${prefix}.shape[${name}]`;

    // Geometry
    for (const prop of ["x", "y", "width", "height"]) {
      if (!withinTolerance(bs.geometry[prop], cs.geometry[prop])) {
        report(
          `${sp}.geometry.${prop}`,
          bs.geometry[prop],
          cs.geometry[prop]
        );
      }
    }

    // Fill color
    if (bs.style.fillColor !== cs.style.fillColor) {
      report(`${sp}.fillColor`, bs.style.fillColor, cs.style.fillColor);
    }

    // Stroke color
    if (bs.style.strokeColor !== cs.style.strokeColor) {
      report(`${sp}.strokeColor`, bs.style.strokeColor, cs.style.strokeColor);
    }

    // Text
    if (bs.text !== cs.text) {
      report(`${sp}.text`, bs.text, cs.text);
    }
  }

  // Check for shapes in current but not in baseline
  for (const name of currShapes.keys()) {
    if (!baseShapes.has(name)) {
      report(`${prefix}.shape[${name}]`, "MISSING", "present (extra)");
    }
  }

  // Compare line counts
  if (bc.lines.length !== cc.lines.length) {
    report(`${prefix}.lines.count`, bc.lines.length, cc.lines.length);
  }
}

if (diffs === 0) {
  console.log("No differences found (within tolerance of " + tolerance + "px)");
  process.exit(0);
} else {
  console.log(`\n${diffs} difference(s) found.`);
  process.exit(1);
}
