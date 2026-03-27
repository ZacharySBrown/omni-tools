# Execution Plan: Phase 2 — Guided Diagram Generation

## Design Doc
[Phase 2 — Guided Generation](../../design-docs/phase2-guided-generation.md)

## Status
Active — 7 tasks remaining

## Task Breakdown

### Task 1: Type definitions for Phase 2 tools
- **Layer**: Types
- **Depends on**: (none)
- **Files**: `src/types/diagram.ts` (add `ApplyStylePresetInputSchema`, `AddElementInputSchema`, `ExtractStyleInputSchema`)
- **TDD**: Write tests that schemas accept valid input and reject invalid for all 3 new tools
- **Done when**: All 3 input schemas compile and pass validation tests
- **Status**: [ ] pending

### Task 2: Bridge — apply style preset JXA
- **Layer**: Bridge
- **Depends on**: Task 1
- **Files**: `src/bridge/apply-style.ts`
- **TDD**: Write test that `buildApplyStyleScript()` generates correct JXA with role mapping and font updates
- **Done when**: Script iterates shapes, matches by name/role, applies colors and typography
- **Status**: [ ] pending

### Task 3: Bridge — add element JXA
- **Layer**: Bridge
- **Depends on**: Task 1
- **Files**: `src/bridge/add-element.ts`
- **TDD**: Write tests for shape creation, line connection by name, and text annotation scripts
- **Done when**: Scripts handle all 3 element types with correct style application
- **Status**: [ ] pending

### Task 4: Bridge — extract style JXA
- **Layer**: Bridge
- **Depends on**: Task 1
- **Files**: `src/bridge/extract-style.ts`
- **TDD**: Write test that `buildExtractStyleScript()` generates JXA that samples shape properties and returns JSON
- **Done when**: Script iterates all canvases/shapes and returns sampled color/font/geometry data
- **Status**: [ ] pending

### Task 5: Style extraction logic
- **Layer**: Styles
- **Depends on**: Task 4
- **Files**: `src/styles/extractor.ts`
- **TDD**: Write test that `buildPresetFromSamples()` produces valid StyleTokens from sample data
- **Done when**: Frequency-based color mapping works, output passes Zod validation
- **Status**: [ ] pending

### Task 6: MCP tools — apply_style_preset, add_element, extract_style_from_document
- **Layer**: Tools
- **Depends on**: Tasks 2, 3, 4, 5
- **Files**: `src/tools/apply-style-preset.ts`, `src/tools/add-element.ts`, `src/tools/extract-style.ts`, update `src/tools/index.ts`
- **TDD**: Write tests for input validation, bridge delegation, and response structure for all 3 tools
- **Done when**: All 3 tools register, validate input, delegate to bridge, return structured responses
- **Status**: [ ] pending

### Task 7: Diagram templates as MCP resources
- **Layer**: Server + new `src/templates/`
- **Depends on**: Task 6
- **Files**: `src/templates/index.ts`, `src/templates/experiment-loop.ts`, `src/templates/agent-harness.ts`, update `src/index.ts`
- **TDD**: Write test that templates are valid and resource listing works
- **Done when**: `claude mcp` shows resource list, each template has name/description/canonical node-connection structure
- **Status**: [ ] pending

## Decision Log

| Decision | Date | Context |
|----------|------|---------|
| Templates as MCP resources not tools | 2026-03-26 | Resources are discoverable; Claude reads them to inform create_diagram calls |
| Frequency-based color mapping for extraction | 2026-03-26 | Heuristic is good enough; user can edit preset JSON after |

## Risks

- **extract_style_from_document JXA color reading** — OmniGraffle returns colors as objects, not hex strings. Bridge script must convert RGB components back to hex. Test with real OmniGraffle.
- **Shape name matching** — `add_element` line connections depend on shapes having `.name` set. Diagrams not created by our tool may have empty names.

## Critical Path

```
Task 1 → Task 2 → Task 6
       → Task 3 ↗
       → Task 4 → Task 5 ↗
                         → Task 7
```

**Parallelizable**: Tasks 2, 3, 4 can all start once Task 1 is done.
