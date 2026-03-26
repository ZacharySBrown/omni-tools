# Execution Plan: Phase 1 — MVP

## Design Doc
[Phase 1 — MVP](../../design-docs/phase1-mvp.md)

## Status
Active — 10 tasks remaining

## Task Breakdown

### Task 1: Project scaffolding
- **Layer**: All
- **Depends on**: (none)
- **Files**: `package.json`, `tsconfig.json`, `.gitignore`, `src/` directory structure, `tests/` directory structure
- **TDD**: Verify `npx tsc --noEmit` passes on empty project
- **Done when**: `npm install` succeeds, `npx tsc --noEmit` passes, Vitest runs with zero tests
- **Status**: [ ] pending

### Task 2: Core type definitions
- **Layer**: Types
- **Depends on**: Task 1
- **Files**: `src/types/styles.ts`, `src/types/diagram.ts`, `src/types/bridge.ts`, `src/types/index.ts`
- **TDD**: Write tests that Zod schemas accept valid input and reject invalid input for `StyleTokens`, `NodeSchema`, `ConnectionSchema`, `CreateDiagramInput`, `ExportDiagramInput`
- **Done when**: All Zod schemas compile and pass validation tests
- **Status**: [ ] pending

### Task 3: Style preset files
- **Layer**: Styles (data)
- **Depends on**: Task 2
- **Files**: `presets/illustrated-technical.json`, `presets/clean-academic.json`
- **TDD**: Write test that loads each JSON file and validates against `StyleTokensSchema`
- **Done when**: Both presets pass Zod validation, all color/typography/shape values match spec
- **Status**: [ ] pending

### Task 4: Style preset loader
- **Layer**: Styles
- **Depends on**: Tasks 2, 3
- **Files**: `src/styles/loader.ts`, `src/styles/index.ts`
- **TDD**: Write tests for `loadPreset()`, `listPresets()`, `resolveSemanticColor()`
- **Done when**: Can load a preset by name from `DIAGRAMMER_PRESETS_DIR`, list all presets, resolve role→color
- **Status**: [ ] pending

### Task 5: OmniGraffle bridge — core execution
- **Layer**: Bridge
- **Depends on**: Task 2
- **Files**: `src/bridge/execute.ts`, `src/bridge/availability.ts`
- **TDD**: Write tests for `runOmniJS()` and `runOmniJSFile()` (mock `execFileSync`), test `checkOmniGraffleAvailable()`
- **Done when**: Can execute a JXA script via temp file and return `BridgeResult`, availability check works
- **Status**: [ ] pending

### Task 6: OmniGraffle bridge — diagram creation
- **Layer**: Bridge
- **Depends on**: Tasks 4, 5
- **Files**: `src/bridge/diagram.ts`, `src/bridge/jxa-helpers.ts`
- **TDD**: Write test that `buildDiagramScript()` produces valid JXA given sample nodes/connections/preset; test `hex2color` JXA helper is included
- **Done when**: `buildDiagramScript()` generates a complete JXA script string with shape creation, connection, layout, and color application
- **Status**: [ ] pending

### Task 7: OmniGraffle bridge — export
- **Layer**: Bridge
- **Depends on**: Task 5
- **Files**: `src/bridge/export.ts`
- **TDD**: Write test that `buildExportScript()` produces valid JXA for PDF/SVG/PNG export
- **Done when**: `buildExportScript()` generates correct export JXA for all supported formats
- **Status**: [ ] pending

### Task 8: MCP tool — `create_diagram`
- **Layer**: Tools
- **Depends on**: Tasks 2, 6
- **Files**: `src/tools/create-diagram.ts`
- **TDD**: Write test that tool validates input, calls bridge with correct args, returns structured MCP response
- **Done when**: Tool registers with correct name/schema, validates input with Zod, delegates to bridge, returns success/error
- **Status**: [ ] pending

### Task 9: MCP tools — `export_diagram` and `list_style_presets`
- **Layer**: Tools
- **Depends on**: Tasks 4, 7
- **Files**: `src/tools/export-diagram.ts`, `src/tools/list-style-presets.ts`, `src/tools/index.ts`
- **TDD**: Write tests for input validation and response structure for both tools
- **Done when**: Both tools register, validate input, return correct responses; `registerAllTools()` exports all 3 tools
- **Status**: [ ] pending

### Task 10: MCP server entry point
- **Layer**: Server
- **Depends on**: Task 9
- **Files**: `src/index.ts`
- **TDD**: Write test that server creates and registers all 3 tools (mock MCP SDK)
- **Done when**: `node dist/index.js` starts, connects via stdio, exposes `create_diagram`, `export_diagram`, `list_style_presets`
- **Status**: [ ] pending

## Decision Log

| Decision | Date | Context |
|----------|------|---------|
| Use `src/bridge/` not `src/omnigraffle/` | 2026-03-26 | Layer model consistency; bridge may expand beyond OmniGraffle |
| JSON.stringify injection over template placeholders | 2026-03-26 | Safer, avoids quoting issues in JXA |
| Vitest over Jest | 2026-03-26 | Better TypeScript support, faster, ESM-native |

## Risks

- **OmniGraffle JXA API undocumented edge cases** — mitigation: test with real OmniGraffle early (Task 6); keep a manual integration test that creates an actual diagram
- **Auto-layout produces unexpected results** — mitigation: hierarchical layout is most predictable; document that force/circular may need manual tweaks
- **macOS Automation permission UX** — mitigation: `checkOmniGraffleAvailable()` returns helpful error message guiding user to System Settings

## Critical Path

```
Task 1 → Task 2 → Task 5 → Task 6 → Task 8 → Task 10
                 → Task 3 → Task 4 → Task 9 ↗
                          → Task 7 ↗
```

**Parallelizable**: Tasks 3+5 can start as soon as Task 2 is done. Tasks 7+6 can run in parallel. Tasks 8+9 can largely overlap.

**First tasks to start**: Task 1 (no dependencies), then Task 2 immediately after.
