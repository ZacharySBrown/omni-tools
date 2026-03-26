# Dependency Layers

## The 5-Layer Forward-Only Model

Code flows forward only. Layer N may import from layers 1..N-1 but **never** from layers N+1..5.

```
Types (1) → Styles (2) → Bridge (3) → Tools (4) → Server (5)
```

## Layer Definitions

### Layer 1: Types (`src/types/`)

Pure data definitions. No side effects, no I/O, no dependencies on other layers.

- TypeScript interfaces and type aliases
- Zod schemas for validation
- Enums and constants
- Style token type definitions

**May import from**: nothing (only external: `zod`)
**Examples**: `DiagramInput`, `StyleTokens`, `NodeShape`, `ConnectionStyle`

### Layer 2: Styles (`src/styles/`)

Style preset loading and resolution. Reads preset JSON files, validates with Zod, resolves semantic roles to concrete colors.

**May import from**: Layer 1 (Types)
**Examples**: `loadPreset()`, `resolveSemanticColor()`, `listPresets()`

### Layer 3: Bridge (`src/bridge/`)

OmniGraffle automation. Generates JXA/OmniJS scripts, executes via `osascript`, handles OmniGraffle document operations.

**May import from**: Layers 1-2 (Types, Styles)
**Examples**: `createCanvas()`, `addShape()`, `addConnector()`, `exportDocument()`, `runOmniJS()`

### Layer 4: Tools (`src/tools/`)

MCP tool implementations. Each tool validates input (Zod), orchestrates bridge calls, and returns structured output.

**May import from**: Layers 1-3 (Types, Styles, Bridge)
**Examples**: `createDiagramTool`, `exportDiagramTool`, `createSlideTool`

### Layer 5: Server (`src/server/`)

MCP server setup. Registers tools, configures stdio transport, handles lifecycle.

**May import from**: Layers 1-4 (all lower layers)
**Examples**: `createServer()`, tool registration, `index.ts` entry point

## Enforcement

Layer compliance is checked during `/review`. Backward imports are classified as **CRITICAL** findings that block merge.

Quick check: grep for import paths that violate the rules:
```bash
# Tools should never import from Server
grep -r "from.*server" src/tools/ || echo "OK"
# Bridge should never import from Tools or Server
grep -r "from.*tools\|from.*server" src/bridge/ || echo "OK"
# Styles should never import from Bridge, Tools, or Server
grep -r "from.*bridge\|from.*tools\|from.*server" src/styles/ || echo "OK"
# Types should never import from any other layer
grep -r "from.*styles\|from.*bridge\|from.*tools\|from.*server" src/types/ || echo "OK"
```
