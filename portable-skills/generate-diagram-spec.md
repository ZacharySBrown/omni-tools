# /generate-diagram-spec — Generate a create_diagram JSON spec from a codebase, file, or concept

## When to use
When you need to produce a structured diagram specification before rendering. This is the **thinking step** — use it before calling `create_diagram`. Always use this skill when creating non-trivial diagrams.

## Input modes

The user will provide one of three types of input. Detect which mode applies:

### Mode A: Directory or repo
> "Diagram the architecture of src/core/"
> "Create a diagram of this repo"
> "Show me how the auth module works"

### Mode B: Single file with context
> "Diagram this config file" (with file path or pasted content)
> "Here's our pipeline definition, diagram it"
> "Visualize this YAML/JSON/Python file"

### Mode C: Concept with guidance
> "Diagram how RLHF training works"
> "Create a diagram showing the 4-tier flag resolution"
> "Visualize a transformer encoder block"

The user may also provide **guidance** narrowing the focus:
> "Focus on the data flow, not the error handling"
> "Show the public API surface, skip internals"
> "Include the plugin system"

## Process

### 1. Research (depth depends on input mode)

**Mode A — Directory/repo exploration:**
1. Start with the entry point: `README.md`, `package.json`/`pyproject.toml`, main index file
2. Map the module structure: `ls` or `glob` the directory, identify layers/packages
3. Read key files: entry points, core types/models, main orchestrator
4. Trace the primary data flow: what comes in, what transforms it, what goes out
5. Identify boundaries: external inputs, outputs, plugin points, config
6. If the user gave guidance (e.g., "focus on the API layer"), filter to only relevant modules

**Mode B — Single file analysis:**
1. Read the file completely
2. Identify the entities it defines (classes, functions, config blocks, stages)
3. Identify relationships (imports, calls, references, data flow)
4. If it's config (YAML/JSON): each top-level key or section is likely a node
5. If it's code: classes/modules are nodes, method calls/imports are connections
6. If the user provided additional context, use it to determine which parts matter

**Mode C — Concept with guidance:**
1. Use your knowledge of the concept to identify the standard components
2. If the user referenced specific code/docs, read those for accurate details
3. Map the canonical flow (e.g., for RLHF: pretrain → SFT → reward model → alignment)
4. Identify what makes this particular take interesting (the user's specific variant/implementation)

### 2. Identify entities

For each entity, determine:

```
Entity: [name]
  Role: encoder | decoder | attention | input | output | intermediate | neutral
  Label: [short display text — max ~20 chars per line]
  Sublabel: [secondary text — class name, description, details]
  Shape: rounded_rectangle | diamond | circle | pill | annotation
  Category: core | input | output | annotation | decision
```

**Role assignment heuristics:**
- `encoder` — primary processing components (blue)
- `decoder` — secondary processing, output generation (pink)
- `attention` — decision-making, routing, selection, configuration (warm yellow)
- `input` — data sources, config files, user input (light blue-gray)
- `output` — results, exports, final products (green)
- `intermediate` — internal state, intermediate results (light pink)
- `neutral` — labels, annotations, grouping elements (gray)

### 3. Identify connections

For each relationship:

```
[source] → [target]
  Type: straight | orthogonal | curved
  Label: [optional — verb or data name: "sends", "config", "validates"]
  Style: default | highlight | dashed (dashed = optional/plugin)
```

**Connection heuristics:**
- Data flow: solid lines with labels describing what flows
- Control flow: solid lines, label with action verb
- Optional/plugin: dashed lines
- Bidirectional: use `style: "bidirectional"` sparingly

### 4. Plan the spatial layout

**Determine diagram type from the entity graph:**
- Linear chain → **vertical pipeline** (most common)
- Fan-out from center → **hub-spoke**
- Binary branching → **flowchart/decision tree**
- Multiple parallel chains → **swimlanes** (side-by-side vertical pipelines)

**Vertical pipeline (most common):**
```
Main column:    x=350, width=220-280
Input column:   x=60,  width=180-200  (data sources feeding into main)
Annotation col: x=680, width=200-220  (notes, loss functions, metadata)
Row spacing:    y += 170-200 per stage
Stage labels:   positioned ABOVE their target node (y = node.y - 30)
```

**Horizontal pipeline:**
```
Main row:      y=120
Column spacing: x += 230 per stage
Return row:    y=260 (for loops/feedback)
Width:         160-200px per node
```

**Hub-spoke:**
```
Center:     (400, 280)
Satellites: radius ~250px, distributed by category
```

**Key spacing rules:**
- Minimum **50px gap** between adjacent node edges
- Pre-check text overflow: width >= `longest_line_chars * font_size * 0.6 + 32`
- **Never place annotations between two nodes** — they get sandwiched
- Title annotation: y=10-30, font_size=20-22
- Keep total canvas under 1000x900 for single diagrams

### 5. Produce the spec

Output a complete JSON spec ready for `create_diagram`:

```json
{
  "title": "Diagram Title",
  "style_preset": "illustrated-technical",
  "layout": "manual",
  "save_path": "<ask user or use known project path>",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Display Name",
      "sublabel": "Secondary text",
      "role": "encoder",
      "shape": "rounded_rectangle",
      "width": 220,
      "height": 70,
      "x": 350,
      "y": 50,
      "font_size": 16
    }
  ],
  "connections": [
    {
      "from": "source_id",
      "to": "target_id",
      "line_type": "straight",
      "label": "optional"
    }
  ]
}
```

### 6. Present for review

Before rendering, present a summary so the user can adjust:

```markdown
## Proposed: [Title]

**[N] nodes, [M] connections** | Style: [preset] | Layout: [type]

| ID | Label | Role | Size | Position |
|----|-------|------|------|----------|
| ... | ... | ... | WxH | (x, y) |

### Connections
| From → To | Type | Label |
|-----------|------|-------|
| ... | ... | ... |

Shall I render this, or adjust anything first?
```

If the user approves, proceed to `/diagrammer-create-diagram` to render, review, and export.

## Rules

- **Research depth matches input mode** — don't over-read for a single file, don't under-read for a repo
- **Respect user guidance** — if they say "focus on X", only diagram X
- **Always use manual layout** — auto layout produces poor results
- **Pre-check text widths** — estimate before assigning node widths
- **Keep node count under 15** — split complex systems into multiple diagrams
- **Use semantic roles consistently** — same type of component gets the same role across diagrams
- **Annotations are invisible boxes** — `opacity: 0`, `shape: "annotation"`, placed outside the flow
