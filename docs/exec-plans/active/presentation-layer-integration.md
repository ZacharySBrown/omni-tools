# Execution Plan: Presentation Layer Integration

## Overview

Integrate the presentation layer from the external spec (`ZacharySBrown/deep_learning_modern_nlp`, branch `claude/checkout-external-repo-EYz8k`, directory `omni-tools-presentation-spec/`) into the omni-tools MCP server. This adds multi-slide presentation support: a base diagram with per-slide overrides for progressive reveal, highlighting, dimming, annotations, and topology mutations. Each slide renders as a separate OmniGraffle canvas.

The source code comprises ~900 lines across types, resolver, bridge, tool, and 4 templates, plus ~400 lines of tests (100 test cases across 3 files). Several bugs discovered during E2E testing of issue #22 also exist in the source presentation bridge and must be fixed during integration. Additionally, the presentation bridge duplicates ~150 lines of OmniJS helper code from the diagram bridge, which should be extracted into a shared module first.

---

## Phase 1: Shared OmniJS Helpers

**Goal**: Extract duplicated OmniGraffle Omni Automation code from `src/bridge/diagram.ts` into a shared module. Both the existing diagram bridge and the new presentation bridge will import from it. This is prerequisite to Phase 3 and also shrinks the current 417-line `diagram.ts` toward the 250-line limit.

### Files to create

- **`src/bridge/omnijs-helpers.ts`** (~120 lines) — Shared OmniJS code-generation functions:
  - `emitHexToRGB()` — returns the `hexToRGB` JS function string
  - `emitHexToRGBA()` — returns the `hexToRGBA` JS function string (new; needed for dimmed state alpha)
  - `emitDarkenHex()` — returns the `darkenHex` JS function string
  - `emitDarkenHexAlpha()` — returns the `darkenHexAlpha` JS function string (new; for dimmed strokes)
  - `emitShapeMap()` — returns the `ogShapeMap` object literal
  - `emitSyncLayout()` — returns the synchronous hierarchical layout algorithm (BFS rank assignment, centered row positioning) — lines 279-368 of current `diagram.ts`
  - `emitCanvasFit()` — returns the canvas-fit-to-content snippet — lines 372-392 of current `diagram.ts`
  - `emitShapeCreationLoop(options)` — returns the node creation loop JS, parameterized for diagram vs presentation modes (presentation mode adds state-based alpha/stroke handling)
  - `emitConnectionCreationLoop(options)` — returns the connection creation loop JS, parameterized for diagram vs presentation modes

### Files to modify

- **`src/bridge/diagram.ts`** — Replace inline helper functions and layout/fit code with calls to the shared emitters. Target: shrink from 417 to ~200 lines.

### Key changes vs source

- The emitters return JS **source strings**, not runtime functions. They are template fragments concatenated into the `omniFunc` string.
- The synchronous layout algorithm from `diagram.ts` (lines 279-368) becomes the canonical implementation. The presentation bridge's `canvas.layout()` call (source line ~273-281) will never be ported — replaced by `emitSyncLayout()`.
- The canvas-fit snippet from `diagram.ts` (lines 372-392) becomes shared. The source presentation bridge lacks this entirely and would produce incorrectly-sized canvases.

### Dependencies

None — this is the foundation phase.

### Tests

- **`tests/bridge/omnijs-helpers.test.ts`** — Unit tests for each emitter: verify the returned string contains expected function names, variable references, and structural patterns. (~30 tests)
- **Regression**: Run existing `tests/bridge/diagram.test.ts` after refactor to confirm no behavior change.

### Scope

Medium. The extraction is mechanical but the parameterization for presentation mode (state-based alpha, highlight strokes) requires careful design of the emitter API.

### Risks / Open Questions

- **Emitter API design**: How much parameterization do the shape/connection emitters need? The presentation bridge adds `state` (dimmed/highlighted/normal) handling that the diagram bridge lacks. Options: (a) single emitter with a `mode` flag, (b) separate emitters, (c) base emitter + state overlay snippet. Recommendation: option (a) with a `{ stateHandling: boolean }` flag.
- **String concatenation safety**: All emitters produce JS source strings. Must ensure no user input is interpolated — all data flows through `JSON.stringify(payload)`, not string interpolation.

---

## Phase 2: Types & Resolver

**Goal**: Port presentation types and the resolver into the omni-tools type system. The resolver is a pure function with no OmniGraffle dependency — this is the most straightforward phase.

### Files to create

- **`src/types/presentation.ts`** (~107 lines) — Direct port from source. Contains:
  - `AnnotationStyle` enum
  - `AnnotationSchema` / `Annotation` type
  - `SlideOverrideSchema` / `SlideOverride` type
  - `BaseDiagramSchema`
  - `PresentationSpecInputSchema` (for MCP `.shape` registration)
  - `PresentationSpecSchema` (with `superRefine` cross-validation)
  - `PresentationSpec` type

- **`src/presentation/resolver.ts`** (~181 lines) — Direct port from source. Contains:
  - `NodeState`, `ResolvedAnnotation`, `ResolvedNode`, `ResolvedConnection`, `ResolvedSlide` types
  - `resolvePresentation()` function
  - Helper functions: `connKey`, `resolveAnnotations`, `resolveNodeState`, `resolveConnectionState`

- **`src/presentation/index.ts`** — Re-exports from resolver.

### Files to modify

- **`src/types/index.ts`** — Add re-export of presentation types.

### Key changes vs source

- **Import paths**: Source uses `"./diagram.js"` — adjust to match omni-tools path aliases (e.g., `"../types/diagram.js"` from the presentation directory, or via alias).
- **`src/presentation/` is a new directory** at the same level as `src/bridge/`, `src/tools/`, etc. In the layer model it sits between Styles (layer 2) and Bridge (layer 3) — it imports from Types and Styles but not from Bridge or Tools. This is consistent with the 5-layer model: the resolver is a pure domain function, not a bridge function.
- The resolver imports `loadPreset` from `../styles/loader.js` — this is a layer 2 → layer 2 dependency (allowed).
- **No changes needed to the source logic** — the resolver is correct as-is.

### Dependencies

None (types and resolver have no dependency on the shared helpers).

### Tests

Port all 3 test files from source:
- **`tests/types/presentation.test.ts`** (~155 lines, 8 test cases) — Direct port. Validates Zod schemas including `superRefine` cross-validation.
- **`tests/presentation/resolver.test.ts`** (~226 lines, 15 test cases) — Direct port. Mocks `loadPreset`, tests all node/connection state resolution logic.
- Update import paths to match omni-tools structure.

### Scope

Small-medium. Almost entirely mechanical porting with import path adjustments.

### Risks / Open Questions

- **Layer placement**: `src/presentation/` is a new directory not in the original 5-layer table. It logically lives at layer 2.5 (imports from Types + Styles, exports to Bridge + Tools). Update `docs/architecture/dependency-layers.md` to document this. Alternative: nest under `src/styles/presentation/` to keep it in layer 2.
- **`neutral` role**: The source templates use `role: "neutral"` for added nodes. This already exists in the omni-tools `SemanticRole` enum — no change needed.

---

## Phase 3: Presentation Bridge

**Goal**: Port and fix the presentation bridge. This is where the bulk of bug-fixing happens — applying all corrections discovered during E2E testing of issue #22.

### Files to create

- **`src/bridge/presentation.ts`** (~150 lines, down from source's ~299) — Presentation-specific bridge that uses shared helpers from Phase 1. Contains:
  - `BuildPresentationScriptOptions` interface
  - `buildNodePayload()` — pre-resolves node data (direct port from source, ~35 lines)
  - `buildConnectionPayload()` — pre-resolves connection data (direct port from source, ~18 lines)
  - `buildPresentationScript()` — assembles the JXA script using shared emitters

### Files to modify

- **`src/bridge/index.ts`** — Add re-export of presentation bridge.

### Key changes vs source

These are the **critical bug fixes** that must be applied during porting:

1. **`canvas.layout()` is async — REMOVE IT**
   - Source lines 273-281 call `canvas.layout()` which runs AFTER the script returns.
   - Replace with `emitSyncLayout()` from the shared helpers (Phase 1).
   - The sync layout must run per-canvas (per-slide), not once globally.

2. **Canvas-fit missing — ADD IT**
   - The source bridge never resizes canvases to fit content.
   - Add `emitCanvasFit()` call at the end of each canvas's rendering block.
   - Each slide canvas must be independently fitted.

3. **`hexToRGBA` needed for dimmed state**
   - The source already has `hexToRGBA` and `darkenHexAlpha` — these are correct.
   - Ensure the shared helpers module (Phase 1) includes both variants.

4. **Canvas background color API**
   - If setting slide background: use `canvas.background.fillColor`, NOT `canvas.backgroundColor`.
   - The source doesn't set canvas background, but templates may want it. Add as optional parameter.

5. **Color API correctness**
   - Source uses `Color.RGB(r, g, b, alpha)` — this is correct for Omni Automation.
   - Verify no `.components` usage exists (it doesn't in source, but guard against it in shared helpers).

6. **User data for roles**
   - The source bridge does NOT call `shape.setUserData("role", n.role)` — but the diagram bridge does.
   - Add `shape.setUserData("role", n.role)` to the shared shape creation emitter so presentation nodes also carry role metadata. This is needed for `review_diagram` and `apply_style_preset` tools.

7. **Multi-canvas creation pattern**
   - Source lines 157-166 rename the first canvas and create additional ones via `doc.portfolio.addCanvas()`.
   - This pattern is correct for OmniGraffle Omni Automation but needs a `delay(0.3)` between canvas additions to avoid race conditions (discovered in prior testing).

8. **Line type auto-selection missing**
   - The source bridge hardcodes `line.lineType = LineType.Orthogonal` for all connections.
   - Port the smart line type selection from `diagram.ts` (lines 226-243): straight for aligned nodes, orthogonal for diagonal.
   - This should go in the shared connection emitter (Phase 1).

9. **Magnet auto-selection missing**
   - The source bridge only sets 4 hardcoded magnets on shapes.
   - Port the smart magnet selection from `diagram.ts` (lines 246-261) into the shared connection emitter.
   - Also port custom magnet support (lines 189-196 of `diagram.ts`).

### Dependencies

- Phase 1 (shared helpers)
- Phase 2 (types, `ResolvedSlide` interface)

### Tests

- **`tests/bridge/presentation.test.ts`** — Port from source (~166 lines, 8 test cases), then add:
  - Test that generated script does NOT contain `canvas.layout()` (regression for bug #1)
  - Test that generated script contains canvas-fit logic (regression for bug #2)
  - Test that generated script contains `setUserData` calls (regression for bug #6)
  - Test that multi-slide script creates correct number of canvases
  - Test that dimmed nodes use `hexToRGBA` with alpha
  - Test that highlighted nodes get emphasis stroke width
  - Estimated total: ~20 test cases

### Scope

Large. This is the most complex phase — combines porting, bug-fixing, and integration with the new shared helpers.

### Risks / Open Questions

- **Per-canvas layout**: The sync layout algorithm operates on a flat list of nodes and connections. For presentations, each slide may have different visible nodes. Must ensure the layout runs independently per canvas with only that slide's non-hidden nodes.
- **Annotation positioning after layout**: If auto-layout repositions nodes, anchor-based annotation positions will be wrong. The resolver computes annotation positions from original node positions. Options: (a) annotations always use absolute positions (current behavior), (b) recalculate after layout. Recommendation: start with (a), note as future enhancement.
- **Canvas delay timing**: The `delay(0.3)` between canvas additions is empirical. May need adjustment. Consider making it configurable.

---

## Phase 4: Templates & MCP Tool

**Goal**: Port the 4 presentation templates, create the `create_presentation` MCP tool, and register it in the server.

### Files to create

- **`src/templates/presentations/progressive-system-build.ts`** (~57 lines) — Direct port.
- **`src/templates/presentations/annotated-data-flow.ts`** (~74 lines) — Direct port.
- **`src/templates/presentations/training-vs-inference.ts`** (~72 lines) — Direct port.
- **`src/templates/presentations/architecture-variants.ts`** (~80 lines) — Direct port.
- **`src/templates/presentations/index.ts`** (~24 lines) — Template registry with `getPresentationTemplate()` and `listPresentationTemplates()`.
- **`src/tools/create-presentation.ts`** (~80 lines) — MCP tool implementation. Port from source with adjustments.

### Files to modify

- **`src/types/index.ts`** — Ensure `PresentationSpecInputSchema` is exported (if not done in Phase 2).
- **`src/tools/index.ts`** — Import and register `createPresentationTool` with the MCP server.
  ```typescript
  server.tool(
    createPresentationTool.name,
    createPresentationTool.description,
    PresentationSpecInputSchema.shape,  // Use InputSchema (no superRefine) for MCP .shape
    async (params) => createPresentationTool.execute(params),
  );
  ```

### Key changes vs source

- **MCP registration uses `PresentationSpecInputSchema.shape`** (the plain object schema), not `PresentationSpecSchema.shape`. The `superRefine` validation happens inside `execute()` via `PresentationSpecSchema.parse(input)`. This split already exists in the source code and is the correct pattern — MCP's `.shape` property needs a raw ZodObject, not a ZodEffects.
- **Tool maps to both `create_slide` and `create_slide_deck`** from the original 10-tool spec. Single-slide presentations are just a presentation with `slides.length === 1`. No need for separate tools.
- **`runOmniJSFile`** import path: source uses `"../bridge/execute.js"` — verify this matches the omni-tools path. Current omni-tools has `src/bridge/execute.ts` which exports `runOmniGraffleScript()` (different name). Adjust import.
- **`buildExportScript`** import: source uses `"../bridge/export.js"` — verify against omni-tools. Current has `src/bridge/export.ts`.
- **Templates are data-only** — they define `PresentationSpec` objects. No logic, no OmniGraffle dependency. They import only from `src/types/`.

### Dependencies

- Phase 2 (types)
- Phase 3 (bridge — needed for `buildPresentationScript`)

### Tests

- **`tests/tools/create-presentation.test.ts`** (~60 lines) — Test tool structure, input validation, error handling (mock bridge execution).
- **`tests/templates/presentations.test.ts`** (~40 lines) — Validate each template against `PresentationSpecSchema`, verify template registry functions.

### Scope

Small-medium. Templates are direct ports. Tool is straightforward with existing patterns to follow.

### Risks / Open Questions

- **Tool naming**: The source calls it `create_presentation`. The original 10-tool spec has `create_slide` (#4) and `create_slide_deck` (#5). Recommendation: use `create_presentation` as the single tool name — it handles both single and multi-slide. Update the spec table accordingly.
- **Template directory placement**: `src/templates/` is a new top-level directory. In the layer model it's data (like presets), not code. It imports only from Types (layer 1). Could also live under `src/types/templates/` but a separate directory is cleaner.
- **Export integration**: The source tool supports `output_path` + `output_format` for auto-export after creation. Verify the export bridge works with multi-canvas documents (exports all canvases or just the first?).

---

## Phase 5: E2E Testing

**Goal**: End-to-end test the full presentation path through MCP, verifying that OmniGraffle renders correct multi-canvas documents with proper states, annotations, and layout.

### Files to create

- **`tests/e2e/presentation.test.ts`** (~100 lines) — E2E tests that:
  1. Build a presentation script from a known spec
  2. Execute it against OmniGraffle (requires OmniGraffle running)
  3. Read back the document structure via `evaluateJavascript`
  4. Verify: canvas count, canvas names, shape count per canvas, shape names, connection count, annotation presence, hidden nodes are actually absent

### Test scenarios (minimum)

1. **Progressive reveal**: 3-slide spec where slide 1 shows 2 nodes, slide 2 shows 4, slide 3 shows all 6. Verify canvas count = 3, shape counts = [2, 4, 6].
2. **Highlight + dim**: Single-slide spec with highlighted and dimmed nodes. Read back stroke thickness and fill alpha to verify state rendering.
3. **Annotations**: Slide with callout and label annotations. Verify annotation shapes exist with correct text.
4. **Topology mutation**: Slide with `add_nodes` and `remove_connections`. Verify added shapes exist and removed connections are absent.
5. **Auto-layout**: Presentation with `layout: "auto_hierarchical"`. Verify nodes are repositioned (y-coordinates increase with rank).

### Files to modify

- **`tests/e2e/`** — May need a shared test helper for OmniGraffle readback (could already exist from issue #22 work).

### Dependencies

- Phases 1-4 (all must be complete).
- OmniGraffle must be installed and running on the test machine.

### Scope

Medium. Script generation is testable in unit tests; E2E tests add the OmniGraffle execution and readback layer.

### Risks / Open Questions

- **E2E test infrastructure**: Does omni-tools already have E2E test patterns from issue #22? If so, reuse the same readback helpers and test runner configuration.
- **CI**: E2E tests require macOS + OmniGraffle. These must be skipped in CI or run only on a dedicated Mac runner.
- **Timing**: Multi-canvas documents may need longer delays between canvas additions. If E2E tests are flaky, increase delays or add retry logic.

---

## Migration Notes

These are specific code corrections required when porting from the source branch. Each maps to a bug discovered during E2E testing of issue #22.

### 1. Replace `canvas.layout()` with synchronous layout

**Source location**: `src/bridge/presentation.ts` lines 273-281
**Problem**: `canvas.layout()` is async in OmniGraffle — layout positions update AFTER the script returns, so subsequent code (canvas-fit, readback) sees pre-layout positions.
**Fix**: Use the BFS-based synchronous layout from `diagram.ts` lines 279-368. In Phase 1 this becomes `emitSyncLayout()`.

```javascript
// REMOVE THIS (source lines 273-281):
if (slide.layout !== "manual") {
  var layoutInfo = canvas.layoutInfo;
  try {
    layoutInfo.direction = HierarchicalDirection.Top;
    // ...
  } catch(e) {}
  canvas.layout();  // <-- ASYNC BUG
}

// REPLACE WITH: emitSyncLayout() output from shared helpers
```

### 2. Add canvas-fit-to-content

**Source location**: Missing entirely from `src/bridge/presentation.ts`
**Problem**: Without canvas resizing, content may extend beyond the visible area or leave large empty margins.
**Fix**: Add the canvas-fit snippet after each slide's rendering block. From `diagram.ts` lines 372-392.

### 3. Add `setUserData("role", ...)` to shape creation

**Source location**: `src/bridge/presentation.ts` lines 184-216 (shape creation loop)
**Problem**: Shapes lack role metadata needed by `review_diagram` and `apply_style_preset`.
**Fix**: Add `shape.setUserData("role", n.role)` after `shape.text = n.label` in the shape creation loop.

### 4. Port smart line type selection

**Source location**: `src/bridge/presentation.ts` lines 238-241 — hardcodes `LineType.Orthogonal`
**Problem**: All connections render as orthogonal regardless of node alignment.
**Fix**: Port the auto-selection logic from `diagram.ts` lines 226-243: straight for nearly-aligned endpoints, orthogonal otherwise.

### 5. Port smart magnet selection

**Source location**: `src/bridge/presentation.ts` lines 211-215 — hardcodes 4 magnets, no per-connection magnet override
**Problem**: No directional magnet selection; connections may route suboptimally.
**Fix**: Port custom magnet support (`n.magnets` array) and per-connection `tailMagnet`/`headMagnet` from `diagram.ts` lines 189-196 and 247-261.

### 6. Fix annotation fillColor null handling

**Source location**: `src/bridge/presentation.ts` line 255 — `annShape.fillColor = null`
**Problem**: Setting `fillColor = null` may not produce a transparent background in all OmniGraffle versions.
**Fix**: Use `Color.RGB(1, 1, 1, 0)` for transparent, or omit the fill entirely. Test during Phase 5 E2E.

### 7. Add delay between canvas additions

**Source location**: `src/bridge/presentation.ts` lines 157-166
**Problem**: Rapid canvas creation can cause OmniGraffle race conditions.
**Fix**: Add a small pause in the JXA wrapper between canvas creation and rendering:
```javascript
// After creating all canvases, before rendering:
delay(0.3);
```

### 8. Verify `doc.portfolio.addCanvas()` return value

**Source location**: `src/bridge/presentation.ts` line 163
**Problem**: In some OmniGraffle versions, `addCanvas()` returns void; the new canvas must be accessed by index.
**Fix**: After `addCanvas()`, access the canvas via `doc.portfolio.canvases[doc.portfolio.canvases.length - 1]`. Test during Phase 5 E2E to determine which pattern works.

### 9. Connection payload needs `tailMagnet` and `headMagnet`

**Source location**: `src/bridge/presentation.ts` `buildConnectionPayload()` — missing these fields
**Problem**: Cannot specify per-connection magnet overrides in presentation mode.
**Fix**: Add `tailMagnet` and `headMagnet` fields to the connection payload, matching diagram bridge's `connData` structure. Source `ConnectionSchema` already has `tail_magnet` and `head_magnet` optional fields.

---

## Summary Table

| Phase | Scope | New Files | Modified Files | Tests | Depends On |
|-------|-------|-----------|----------------|-------|------------|
| 1. Shared OmniJS Helpers | Medium | 1 + 1 test | 1 (`diagram.ts`) | ~30 | — |
| 2. Types & Resolver | Small-Med | 3 + 2 tests | 1 (`types/index.ts`) | ~23 (ported) | — |
| 3. Presentation Bridge | Large | 1 + 1 test | 1 (`bridge/index.ts`) | ~20 | Phases 1, 2 |
| 4. Templates & MCP Tool | Small-Med | 6 + 2 tests | 2 (`tools/index.ts`, `types/index.ts`) | ~15 | Phases 2, 3 |
| 5. E2E Testing | Medium | 1 | 0 | ~5 scenarios | Phases 1-4 |

**Total estimated new files**: 19 (12 source + 7 test)
**Total estimated test cases**: ~93 (including 100 ported from source, minus duplicates absorbed into refactored tests)
