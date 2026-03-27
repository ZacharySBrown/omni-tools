# Phase 2 — Guided Diagram Generation

## Status
Draft — awaiting staff engineer review

## Problem
Phase 1 gives Claude the primitives (create_diagram, export, presets) but every diagram requires the user to fully specify nodes and connections. Phase 2 adds three capabilities: (1) style intelligence — extract presets from existing docs and re-style existing diagrams, (2) incremental building — add elements one at a time for iterative refinement, (3) codebase-aware diagram generation — higher-level tools that accept architectural descriptions and produce structured specs automatically.

## Context
- Phase 1 is complete: 3 MCP tools, 2 presets, bridge, 73 tests
- Spec covers `extract_style_from_document` (§5 Tool 9), `apply_style_preset` (§5 Tool 4), `add_element` (§5 Tool 7)
- New capability: diagram templates and guidance prompts are not in the original spec — this is a Phase 2 addition

## Proposed Approach

### Tool 4: `apply_style_preset` (#11)

**Layer mapping**: Types (input schema) → Bridge (JXA script to iterate shapes) → Tool

The JXA script:
1. Gets frontmost doc (or opens specified path)
2. Iterates all graphics on target canvas(es)
3. For shapes where `shape.name` matches a semantic role key, applies role colors from preset
4. For all shapes, updates font to preset typography, stroke width to preset defaults
5. Non-destructive: geometry (position, size) untouched

**Key decision**: Shapes are matched by `.name` property, which we set to `node.id` in `create_diagram`. If `remap_by_role` is true, we also check if the name matches a role key (encoder, decoder, etc.) and apply that role's color.

### Tool 7: `add_element` (#8)

**Layer mapping**: Types (input schema) → Bridge (JXA to add one shape/line/annotation) → Tool

Three element types:
- **shape**: Creates one shape at (x, y) with optional dimensions, role color, label
- **line**: Connects two existing shapes by name lookup (`connect_from_name`, `connect_to_name`)
- **text_annotation**: Places a text label at (x, y) with annotation styling

The JXA script finds existing shapes by iterating `canvas.graphics` and matching `.name`. This is the same mechanism `apply_style_preset` uses.

### Tool 9: `extract_style_from_document` (#10)

**Layer mapping**: Types (input schema) → Bridge (JXA to sample all shapes) → Styles (build StyleTokens) → Tool

The JXA script:
1. Gets frontmost doc (or opens specified path)
2. Iterates all shapes on all canvases
3. For each shape, reads: fillColor (as RGB), strokeColor, font name, font size, corner radius, stroke width
4. Returns JSON array of sampled properties

The Tool layer then:
1. Computes most-common values (mode) for each property
2. Maps sampled colors to StyleTokens color slots by frequency (most common = primary, second = secondary, etc.)
3. Builds a complete StyleTokens object with sampled values + sensible defaults for unsampled fields
4. Validates with Zod, writes to preset dir

### Codebase-Aware Diagram Generation (new)

This is a **resource**, not a tool — a set of diagram templates that Claude can reference when generating `create_diagram` calls. Implemented as MCP resources that describe common patterns:

- **Experiment loop**: data loading → preprocessing → model → training loop → evaluation → logging
- **Agent harness**: orchestrator → agents → tools → memory → output
- **Config tree**: hierarchical config with overrides
- **Pipeline DAG**: data source → transforms → sinks with branching

Each template provides a canonical node/connection structure with semantic roles pre-assigned. Claude reads the template and adapts it to the user's specific codebase description.

## Alternatives Considered

### Alt 1: Codebase scanning tool that reads actual code
A tool that takes a directory path, scans Python/TypeScript files, and auto-generates a diagram. Rejected because: too ambitious for Phase 2, high error rate on complex codebases, and Claude already understands code — it just needs good templates to map concepts to diagram structures.

### Alt 2: Templates as static JSON files
Store templates as JSON in a `templates/` directory. Rejected in favor of MCP resources because: resources are discoverable by Claude via the MCP protocol, and templates need prose descriptions that explain when to use each pattern, not just raw node/connection data.

## Acceptance Criteria
- [ ] `apply_style_preset` re-colors shapes by role in an existing OmniGraffle doc
- [ ] `add_element` adds a shape to frontmost canvas and it appears at correct position with correct style
- [ ] `add_element` with type=line connects two existing shapes by name
- [ ] `extract_style_from_document` produces a valid preset JSON from an existing OmniGraffle doc
- [ ] Extracted preset passes Zod validation and can be loaded by `loadPreset()`
- [ ] At least 2 diagram templates are available as MCP resources
- [ ] All new code has tests, TSC clean

## Open Questions
- [ ] `extract_style_from_document` color-to-slot mapping is heuristic — should we ask the user to confirm the mapping, or just go with frequency-based?
- [ ] Should templates be MCP resources or a new MCP tool (`get_diagram_template`)? Resources feel more natural but tools are simpler to implement.
