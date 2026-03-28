---
description: Plan layout, render in OmniGraffle, auto-fix, and export a technical diagram
user-invocable: true
argument-hint: "what to diagram"
---

# /create-diagram — Plan and render a technical diagram

## When to use
When the user asks you to create a diagram, architecture overview, flowchart, pipeline visualization, or any visual representation of a system or process.

## Process

### 1. Understand the subject

Before touching any tools, understand what you're diagramming:
- Read relevant code, docs, or config to understand the system
- Identify the key entities, their relationships, and the data/control flow
- Determine the diagram type: pipeline (linear), architecture (hub-spoke), flowchart (branching), hierarchy (tree)

### 2. Plan the layout

Choose a layout strategy based on diagram type:

**Pipeline (top-to-bottom or left-to-right):**
- Main flow nodes in a vertical or horizontal line, evenly spaced
- Input data nodes to the left of their targets
- Annotation/notes to the right
- Stage labels above or beside (not between nodes — they get sandwiched)
- Spacing: 170-200px between pipeline stages vertically, 230px horizontally

**Architecture (hub-spoke):**
- Central component in the middle
- Related components arranged around it
- Group by layer or responsibility
- Spacing: 230px between groups

**Flowchart (decision tree):**
- Diamonds for decisions, rounded rectangles for actions
- Yes/No branches clearly labeled
- Consistent direction (top-to-bottom preferred)

**General layout rules:**
- Minimum 200px width for nodes with sublabels
- Minimum 50px gap between adjacent nodes
- Annotations (opacity: 0) for floating labels — don't place between nodes
- Use `font_size: 14-18` for main nodes, `12-13` for annotations
- Title annotation at top with `font_size: 20-22`

### 3. Choose a style preset

- **`illustrated-technical`** — Colorful, semantic color-coding by role (encoder=blue, attention=warm, output=green). Best for technical diagrams.
- **`clean-academic`** — Desaturated, minimal, white background. Best for papers, talks, presentations.
- **`xkcd`** — Monochrome, Humor Sans font. Best for informal/fun diagrams.

### 4. Build the spec

Map your entities to the `create_diagram` schema:
- Each entity → a node with `id`, `label`, optional `sublabel`, `role`, position (`x`, `y`), size (`width`, `height`)
- Each relationship → a connection with `from`, `to`, `line_type`
- Use semantic `role` values to get automatic color-coding: `encoder`, `decoder`, `attention`, `input`, `output`, `intermediate`, `neutral`
- Use `shape: "annotation"` with `opacity: 0` for floating text labels
- Use `shape: "diamond"` for decision points
- Use `shape: "pill"` for terminal/result nodes
- Always use `layout: "manual"` and specify coordinates explicitly

### 5. Create, review, and export

This sequence is **mandatory** — never skip the review step:

```
1. create_diagram(title, nodes, connections, save_path, style_preset)
2. review_diagram(auto_fix: true, severity_filter: "warning")
   → Re-run until 0 errors
   → "Needs Spec Change" items: adjust your spec and regenerate
3. export_diagram(output_path, format: "png")  — if needed for markdown
```

### 6. Reference in markdown

Always reference `.png` exports, never `.graffle` files:
```markdown
![Architecture Overview](diagrams/architecture-overview.png)
```

## Rules

- **Always plan before creating** — don't guess at coordinates
- **Always review after creating** — auto_fix catches text overflow and overlaps
- **Always export to PNG** for markdown references
- **Use kebab-case** for exported filenames
- **Ask the user for save_path** on first use if not already known
