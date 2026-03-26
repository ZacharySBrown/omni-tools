# Phase 1 — MVP

## Status
Draft — awaiting staff engineer review

## Problem
Claude Code needs to create styled OmniGraffle diagrams from structured specs. Today there's no way to drive OmniGraffle from Claude Code. Phase 1 delivers the minimum viable path: `create_diagram`, `export_diagram`, `list_style_presets`, two built-in presets, and the stdio MCP server — enough to go from a one-sentence description to an exported PDF.

## Context
- `initial-spec.md` defines the full 9-tool system across 4 phases
- No code exists yet — this is a greenfield build
- Stack: Node.js 20+, TypeScript 5+ strict, MCP SDK, Zod
- Target: macOS only, OmniGraffle Pro 7.12+ with Omni Automation
- Automation bridge: JXA (JavaScript for Automation) via `osascript`

## Proposed Approach

### Layer Mapping

| Layer | What Phase 1 Creates |
|-------|---------------------|
| **Types** | `StyleTokens` interface + Zod schema, `NodeSchema`, `ConnectionSchema`, `CreateDiagramInput`, `ExportDiagramInput`, `BridgeResult`, common enums (roles, shapes, layouts) |
| **Styles** | `loadPreset()`, `resolveSemanticColor()`, `listPresets()`, validate with Zod |
| **Bridge** | `runOmniJS()`, `runOmniJSFile()`, `checkOmniGraffleAvailable()`, `hex2color` JXA helper, canvas creation, shape creation, connector creation, layout invocation, export |
| **Tools** | `create_diagram`, `export_diagram`, `list_style_presets` — each validates input with Zod, delegates to bridge |
| **Server** | `index.ts` — creates `McpServer`, registers 3 tools, connects stdio transport |

### Data Flow

```
User prompt → Claude Code → MCP tool call (JSON)
  → Server receives → Tool validates (Zod)
    → Tool loads style preset (Styles layer)
    → Tool builds JXA script with nodes/connections/colors
    → Bridge writes script to temp file, executes via osascript
    → OmniGraffle creates document/shapes/connectors
    → Bridge returns success/error
  → Tool returns MCP response → Claude Code shows result
```

### Key Design Decisions

1. **`runOmniJSFile` for all diagram creation** — JXA scripts with node/connection data are too complex for inline `osascript -e`. Always write to temp file. Inline `runOmniJS` reserved for simple queries (availability check, export).

2. **Style tokens injected as JSON literal in JXA** — The template approach from the spec (`__PRESET_JSON__` replacement) is fragile. Instead, serialize the preset and node/connection data as `JSON.stringify`'d strings, then `JSON.parse` them at the top of the JXA script. This avoids all quoting issues.

3. **Shape names = node IDs** — Set `shape.name = node.id` in OmniGraffle so connections can look up shapes by name. This also enables `add_element` (Phase 2) to connect to existing shapes.

4. **Presets stored as JSON files** — Loaded from `DIAGRAMMER_PRESETS_DIR` env var, validated with Zod on load. Invalid presets logged and skipped.

## Alternatives Considered

### Alt 1: Template-based JXA with string interpolation
The spec suggests `__PLACEHOLDER__` replacement in `.js.template` files. Rejected because: string interpolation in JXA is fragile (nested quotes, special characters in labels), harder to test (must test template rendering separately), and the `JSON.stringify` → `JSON.parse` approach is safer and testable.

### Alt 2: OmniGraffle Omni Automation plug-in
Instead of calling `osascript` externally, register a native OmniGraffle plug-in that accepts commands. Rejected because: higher setup friction (user must install plug-in), harder to debug, and `osascript` with file-based scripts works reliably for this use case.

## macOS / OmniGraffle Considerations
- User must grant Automation permission to Terminal/Claude Code for OmniGraffle control — the `checkOmniGraffleAvailable()` function will detect this and return a helpful error
- `execFileSync` (not `execSync`) used for `osascript` to avoid shell injection — arguments passed as array, not interpolated into a shell command
- Timeout of 60s for diagram creation (complex diagrams with many nodes), 30s for simple operations
- OmniGraffle auto-layout (`canvas.layout()`) behavior varies by layout engine — hierarchical is most predictable, force/circular may need manual position tweaks

## Acceptance Criteria
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm test` passes — all Zod schemas validate expected inputs and reject invalid ones
- [ ] `create_diagram` creates an OmniGraffle document with correct shapes, colors, and connections from a test spec
- [ ] `export_diagram` exports the frontmost OmniGraffle doc to PDF
- [ ] `list_style_presets` returns both built-in presets with name, description, version
- [ ] Style preset colors match the spec — encoder=primary, decoder=secondary, etc.
- [ ] MCP server starts and registers 3 tools visible to Claude Code
- [ ] End-to-end: Claude Code can call `create_diagram` and get a styled PDF on the Desktop

## Open Questions
- [ ] Should `create_diagram` auto-save the `.graffle` file, or just leave it open and unsaved? Spec doesn't say explicitly. Recommendation: leave open and unsaved (user can save manually; auto-export to PDF handles the output need).
- [ ] The spec's directory structure puts bridge code in `src/omnigraffle/` but our layer model calls it `src/bridge/`. Recommendation: use `src/bridge/` for consistency with the layer model, since `omnigraffle` is too specific (if we ever add D2 support, the bridge would handle that too).
