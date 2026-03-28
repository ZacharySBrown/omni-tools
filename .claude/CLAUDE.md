# diagrammer-mcp

MCP server enabling Claude Code to create styled technical diagrams and presentation slides in OmniGraffle on macOS, styled after Jay Alammar's Illustrated Transformer aesthetic.

## Installation & Setup

### Prerequisites

- **macOS** (OmniGraffle is macOS-only)
- **OmniGraffle Pro** (required for automation/scripting)
- **Node.js 20+**
- **System Settings → Privacy & Security → Automation**: allow Terminal to control OmniGraffle

### Install from source

```bash
git clone git@github.com:ZacharySBrown/omni-tools.git
cd omni-tools
npm install
npm run build
```

### Register as a global MCP server

This makes the diagrammer tools available in **every Claude Code session**, regardless of which repo you're in:

```bash
claude mcp add --transport stdio --scope user diagrammer \
  -- node /path/to/omni-tools/dist/index.js
```

Replace `/path/to/omni-tools` with the absolute path to your clone.

### Verify

```bash
claude mcp list
```

You should see `diagrammer` listed. Start a new Claude Code session in any repo and the 12 MCP tools will be available.

### What you get

| Component | Scope | What it provides |
|-----------|-------|-----------------|
| **MCP tools** (12) | Global — available in any repo | `create_diagram`, `review_diagram`, `export_diagram`, `extract_diagram_spec`, `fetch_xkcd`, etc. |
| **Skills** (`/review`, `/design`, etc.) | Project-local — only in omni-tools | Structured workflows for development on the diagrammer itself |
| **Agents** (architect, engineer, etc.) | Project-local — only in omni-tools | Role personas for development on the diagrammer itself |
| **Style presets** | Bundled with MCP server | `illustrated-technical`, `clean-academic`, `xkcd` |

When working in a different repo, you use the MCP tools directly — ask Claude to create diagrams, review them, export to PNG, etc. The skills and agents are for developing on the diagrammer itself.

### After updating omni-tools

If you pull new changes, rebuild before your next Claude session:

```bash
cd /path/to/omni-tools
npm run build
```

The MCP server loads the compiled JS from `dist/`, so a rebuild picks up any new tools or fixes.

## Architecture: 5-Layer Forward-Only Model

Code flows forward only: `Types → Styles → Bridge → Tools → Server`

| Layer | Directory | Purpose |
|-------|-----------|---------|
| 1 | `src/types/` | TypeScript interfaces, Zod schemas, enums |
| 2 | `src/styles/` | Style preset loading, StyleTokens schema, built-in presets |
| 3 | `src/bridge/` | OmniGraffle JXA/OmniJS automation bridge |
| 4 | `src/tools/` | MCP tool implementations (10 tools) |
| 5 | `src/server/` | MCP server setup, stdio transport registration |

**Backward imports are forbidden.** Layer N cannot import from Layer N+1. Tools never import from Server. Bridge never imports from Tools.

## Key Commands

```bash
npm run build                    # Compile TypeScript
npm run dev                      # Watch mode
npm test                         # Run tests (Vitest)
npm run test:watch               # Watch mode tests
npx tsc --noEmit                 # Type check only
npx eslint .                     # Lint
npx eslint . --fix               # Auto-fix lint issues
```

## Issue Tracking

This project uses **GitHub Issues** for all task tracking. **Every piece of work must have a corresponding issue.**

### Required workflow

1. **Before starting work**: Create an issue (or find an existing one) for what you're about to do. Link the issue in your commit messages.
2. **When committing**: Reference the issue number in the commit body. If the commit fully resolves the issue, close it.
3. **After completing a task**: Verify the issue is closed. If you forgot to create one, create it retroactively and close it with a reference to the commit SHA.
4. **Multi-commit work**: Create the issue at the start, reference it in each commit, close it when the last commit lands.

### Commands

```bash
gh issue list                              # List open issues
gh issue create --title "..." --body "..."  # Create issue
gh issue close <number>                     # Close issue
gh issue view <number>                      # View details
```

### Issue body format

```markdown
## Summary
<1-3 bullet points describing what was done or needs doing>

### Details
<Technical details, design decisions, files changed>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Do not batch multiple unrelated changes into one issue.** Each distinct feature, fix, or improvement gets its own issue.

## Documentation (Progressive Disclosure)

- **Architecture** → `docs/architecture/dependency-layers.md`
- **Design docs** → `docs/design-docs/`
- **Exec plans** → `docs/exec-plans/active/`
- **Product spec** → `initial-spec.md`

## Conventions

- **Node.js 20+, TypeScript 5+ strict mode**
- **Zod at all boundaries**: MCP tool inputs, style preset loading, config parsing
- **No `console.log` in production code**: Use MCP SDK logging or structured error reporting
- **File size limit**: 250 lines max. Split larger files into focused modules.
- **Naming**: camelCase for functions/variables, PascalCase for types/classes, UPPER_CASE for constants
- **Tests**: Every tool and bridge function needs tests. TDD preferred. `tests/` mirrors `src/` structure.
- **Imports**: Absolute from project root via path aliases. No relative imports across layers.
- **JXA safety**: Never interpolate untrusted input into `osascript` commands. Use temp files for complex scripts.

## Review Gates

**Critical (blocks merge)**:
- Layer dependency violations
- Missing tests for new tools or bridge functions
- TypeScript strict-mode errors
- Zod validation missing at tool input boundaries
- Shell injection in JXA bridge

**Advisory (suggest, don't block)**:
- Style/formatting (auto-fixable via ESLint)
- Doc freshness
- Naming conventions
- File size over 250 lines

## Agent Roles

Four specialized roles provide distinct perspectives, constraints, and escalation behaviors. Roles activate automatically via skills or manually via `/role`.

| Role | Skills | Posture |
|------|--------|---------|
| **Architect** | `/design`, `/plan` | Strategic — designs systems, evaluates trade-offs |
| **Engineer** | `/scaffold` | Tactical — implements via TDD, follows patterns |
| **Reviewer** | `/review` | Reactive — reviews changes, enforces gates |
| **Operator** | `/quality`, `/cleanup`, `/docs` | Proactive — scans health, manages entropy |

- **Dev-time profiles**: `.claude/agents/{role}.md` — persona, constraints, escalation rules
- **Activate manually**: `/role architect` (persists until `/role {other}` or "drop role")
- **Auto-activation**: Each skill loads its mapped role automatically

## Development Workflow

```
/design → Design Doc → /plan → Exec Plan → Implement (TDD) → /review → Merge
```

## The 10 MCP Tools (Spec Reference)

| # | Tool | Phase | Purpose |
|---|------|-------|---------|
| 1 | `create_diagram` | MVP | Create structured diagram from node/connection spec |
| 2 | `export_diagram` | MVP | Export OmniGraffle doc to PDF/SVG/PNG |
| 3 | `list_style_presets` | MVP | List available style presets |
| 4 | `create_slide` | Phase 2 | Create single 16:9 presentation slide |
| 5 | `create_slide_deck` | Phase 2 | Create multi-slide OmniGraffle document |
| 6 | `generate_from_mermaid` | Phase 2 | Convert Mermaid diagram to OmniGraffle |
| 7 | `add_element` | Phase 2 | Add single element to frontmost canvas |
| 8 | `extract_style_from_document` | Phase 3 | Extract style preset from existing document |
| 9 | `apply_style_preset` | Phase 3 | Apply style preset to existing document |
| 10 | `review_diagram` | Quality | Review rendered diagram for text overflow, overlap, contrast, consistency |
| 11 | `extract_diagram_spec` | Quality | Extract create_diagram-compatible spec from frontmost document for round-trip editing |

## Output Directory (`save_path`)

All diagram/slide creation tools accept an optional `save_path` parameter — the directory where the `.graffle` file is saved. This makes documents editable in OmniGraffle (not read-only).

**Required workflow when using the diagrammer MCP tools:**
1. **First use in a project**: Ask the user where they want generated `.graffle` files saved
2. **Save their answer as a memory** (type: `user` or `project`) so it persists across conversations
3. **Pass `save_path` on every `create_diagram`, `create_slide`, `create_slide_deck` call**
4. If no `save_path` is provided, files save to `/tmp` (fallback only)

The user's preferred output directory is project-specific — different repos may use different paths (e.g., `~/Documents/diagrams`, `./output`, etc.).

## Diagram Workflow: Create → Review → Export

**Every diagram must be reviewed before export.** Follow this sequence:

1. **Create**: `create_diagram(save_path=...)` — generates `.graffle`
2. **Review + Auto-Fix**: `review_diagram(auto_fix: true)` — fix text overflow, overlaps. Run multiple passes until 0 errors. Escalated issues (sandwiched shapes) require spec changes.
3. **Export**: `export_diagram(output_path=..., format="png")` — only after review passes

**Markdown rendering rules:**
- VS Code / GitHub markdown preview cannot render `.graffle` files
- **Always export diagrams to PNG** when they will be referenced in markdown
- Reference the `.png` file in markdown, not the `.graffle`: `![Title](diagram-name.png)`
- Keep both `.graffle` (editable source) and `.png` (rendered output) in the same directory
- Use kebab-case for exported filenames: `architecture-overview.png`, not spaces

## Style System

Two built-in presets:
- **`illustrated-technical`** — Jay Alammar Illustrated Transformer aesthetic (flat, color-coded, semantic)
- **`clean-academic`** — Zak Brown PyData/AnacondaCon style (white bg, minimal, technical)

Style presets are JSON files in `DIAGRAMMER_PRESETS_DIR`. Each defines colors, semantic roles, typography, shapes, connectors, and layout parameters.

## Diagram Review System

Quality checks for rendered diagrams are configured in `review/checks.yaml`. Each check has an `id`, `severity` (error/warning/info), `type` (automated/prompt), tunable `params`, and a `prompt` template.

- **Automated checks** run against the OmniGraffle readback and produce findings programmatically.
- **Prompt-based checks** generate review prompts for Claude to evaluate visually.
- Add new checks by editing `review/checks.yaml` (automated checks also need an implementation in `src/bridge/review.ts`).

```bash
# Run review against frontmost OmniGraffle document (via MCP or directly):
node -e "const r = require('./dist/bridge/review.js'); ..."
```
