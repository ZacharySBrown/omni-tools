# /create-slide-deck — Plan and render a multi-slide presentation

## When to use
When the user asks you to create a slide deck, presentation walkthrough, or multi-slide visual explanation of a system, talk, or concept.

## Process

### 1. Research the subject

Before building slides:
- Read the codebase, docs, README, or whatever the presentation covers
- Identify the narrative arc: what's the story? (problem → solution → how it works → why it matters)
- Plan 3-7 slides with clear titles and purposes

### 2. Plan the slide structure

Each slide needs:
- **Title** — short, descriptive
- **Key visual** — a diagram that illustrates the point (not just text)
- **Supporting content** — bullet points, code snippets, or annotations in the markdown

**Common slide patterns:**
1. Problem statement (motivating example or pain point)
2. Architecture overview (system diagram)
3. Key mechanism deep-dive (detailed flow)
4. Cross-cutting concern (what makes it novel)
5. End-to-end walkthrough (rendering pipeline, usage flow)

### 3. Build diagrams for each slide

Follow the `/create-diagram` skill for each individual diagram. Key considerations for presentations:
- Use a consistent style preset across all slides
- Keep node counts manageable (5-10 per diagram, not 20)
- Use the same semantic roles consistently (encoder=blue throughout)
- Title annotations at the top of each diagram

### 4. Create the markdown walkthrough

Structure as a single markdown file with:
- H1 title and subtitle
- H2 per slide with `---` separators
- Diagram image references (PNG, not graffle)
- Supporting text: bullet points, code blocks, annotations
- xkcd comic if relevant (use `fetch_xkcd` tool)

```markdown
# Talk Title

### Subtitle

---

## Slide 1: The Problem

![Problem Diagram](diagrams/problem.png)

- Key point 1
- Key point 2

---

## Slide 2: Architecture

![Architecture](diagrams/architecture.png)

| Component | Purpose |
|-----------|---------|
| ...       | ...     |
```

### 5. Export all diagrams

For each diagram:
1. `review_diagram(auto_fix: true)` — fix issues
2. `export_diagram(format: "png")` — render to PNG
3. Reference the PNG in markdown

## Rules

- **Every slide should have a diagram** — this is a visual presentation tool
- **Consistent style** across all slides in a deck
- **Research first** — read the code/docs before planning slides
- **Review every diagram** before exporting
- **Ask for save_path** on first use
