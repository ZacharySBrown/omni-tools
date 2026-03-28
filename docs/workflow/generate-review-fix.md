# Diagram Development Workflow

The diagrammer-mcp tools support a **generate → review → edit → extract** loop that lets you iterate between programmatic generation and manual refinement.

![Workflow Diagram](../../graffles/Diagram%20Development%20Workflow.graffle)

## The Loop

### 1. Generate: `create_diagram`

Create a diagram from a structured spec of nodes, connections, roles, and positions. Always pass `save_path` so the `.graffle` file is editable.

```
create_diagram(title, nodes, connections, save_path: "./graffles")
```

### 2. Review & Auto-Fix: `review_diagram`

Run automated checks with `auto_fix: true`. The tool detects and fixes issues in-place, then re-runs checks to confirm.

```
review_diagram(auto_fix: true, severity_filter: "warning")
```

### 3. Manual Edit in OmniGraffle

Open the saved `.graffle` file and make manual adjustments — reposition labels, tweak colors, resize shapes, fix anything the auto-fix escalated.

### 4. Extract: `extract_diagram_spec`

Capture all manual edits back into a `create_diagram`-compatible JSON spec. This spec can be stored, version-controlled, and used for future regeneration.

```
extract_diagram_spec()
```

Then feed the updated spec back into step 1 to regenerate.

## Auto-Fix Tiers

![Decision Tree](../../graffles/Auto-Fix%20Decision%20Tree.graffle)

The review tool classifies issues into two tiers:

### Tier 1: Auto-Fixable

Issues the tool resolves in-place without human intervention.

| Check | Fix | Details |
|-------|-----|---------|
| `text_overflow` | Widen shape | Adds 16px buffer beyond estimated text width |
| `shape_overlap` (single neighbor) | Shift apart | Moves smaller shape away, 8px padding |

### Tier 2: Escalation

Issues that require changes to the diagram spec. The tool reports these with actionable guidance instead of attempting a fix.

| Condition | Why | Guidance |
|-----------|-----|----------|
| Sandwiched shape | Overlaps neighbors on opposite sides — shifting creates new collisions | Reposition the element in the diagram spec (e.g., move label above instead of beside) |
| Layout conflict | Multiple shapes competing for the same space | Restructure the spatial layout in the spec |

### How Sandwiching Is Detected

Before shifting a shape, the fix simulates the proposed movement and checks whether it would collide with any other shape on the canvas. If it would, the shape is "sandwiched" and the fix is escalated rather than applied — preventing ping-pong behavior.

## Round-Trip Editing

The `extract_diagram_spec` tool enables **round-trip editing**: any change made in OmniGraffle (repositioning, resizing, retyping, recoloring) is captured in the extracted spec. This means you can:

- Generate a baseline diagram programmatically
- Polish it manually in OmniGraffle
- Extract the polished spec for future regeneration
- Maintain the spec in version control

The extractor reverse-maps fill colors to semantic roles, infers shape types from stroke/corner radius, and preserves non-default text colors.
