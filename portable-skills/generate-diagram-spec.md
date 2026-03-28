# /generate-diagram-spec — Generate a create_diagram JSON spec from a codebase or concept

## When to use
When you need to produce a structured diagram specification before rendering. This is the **thinking step** — use it before calling `create_diagram`. Use this when:
- Diagramming a codebase you haven't fully analyzed yet
- The diagram has more than 5-6 nodes and needs careful layout planning
- You want the user to review/approve the spec before rendering

## Process

### 1. Research

Gather information about what to diagram:
- **For a codebase**: Read key files, identify modules, trace data flow, understand relationships
- **For a concept**: Identify entities, their roles, and how they connect
- **For a talk/presentation**: Identify the narrative points that need visual support

### 2. Identify entities

List every entity that should appear in the diagram:

```
Entity: [name]
  Role: encoder | decoder | attention | input | output | intermediate | neutral
  Label: [display text]
  Sublabel: [secondary text, optional]
  Shape: rounded_rectangle | diamond | circle | pill | annotation
  Relative position: [where in the flow — top/left/center/right/bottom]
```

### 3. Identify connections

List every relationship:

```
[source] → [target]
  Type: straight | orthogonal | curved
  Label: [optional edge label]
  Style: default | highlight | dashed
```

### 4. Plan the spatial layout

Calculate coordinates based on diagram type:

**Vertical pipeline (most common):**
```
- First row: y=50, subsequent rows: y += 170-200
- Center column: x=350 for main nodes (width 220-280)
- Left column: x=60 for input/data nodes (width 180-200)
- Right column: x=680 for annotations (width 200-220)
- Labels/stages: x=270, positioned above their target node
```

**Horizontal pipeline:**
```
- First column: x=30, subsequent: x += 230
- All nodes on same y (y=120 for main row)
- Return row: y += 140
- Consistent widths (160-180px)
```

**Hub-spoke architecture:**
```
- Central node at (350, 250)
- Satellites at radius ~250px, evenly distributed
- Group related satellites together
```

**Key spacing rules:**
- Minimum 50px gap between adjacent node edges
- Account for text overflow: nodes with long labels need width >= (char_count * font_size * 0.6 + 32)
- Annotations: place outside the main flow, never between nodes
- Title annotation: top of diagram, y=10-30, font_size 20-22

### 5. Produce the spec

Output a complete JSON spec that can be passed directly to `create_diagram`:

```json
{
  "title": "Diagram Title",
  "style_preset": "illustrated-technical",
  "layout": "manual",
  "save_path": "/path/to/save",
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

### 6. Present for review (optional)

If the diagram is complex, present the spec to the user as a summary table before rendering:

```markdown
## Proposed Diagram: [Title]

### Nodes (N)
| ID | Label | Role | Position |
|----|-------|------|----------|
| ... | ... | ... | (x, y) |

### Connections (M)
| From → To | Type | Label |
|-----------|------|-------|
| ... | ... | ... |

Shall I render this?
```

## Rules

- **Never skip the research step** — read the code before designing the diagram
- **Always use manual layout** — auto layout produces poor results
- **Width-check your labels** — estimate: `chars * font_size * 0.6 + 32` must be ≤ node width
- **Keep node count under 15** — split complex systems into multiple diagrams
- **Use semantic roles** — they drive color-coding automatically
- **Annotations are invisible boxes** — set `opacity: 0`, `shape: "annotation"`
