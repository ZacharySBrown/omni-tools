# /design — Create a Design Document from an Idea

## Role
Before beginning, read `.claude/agents/architect.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are creating a design document for a new feature or capability. Follow these steps precisely.

## Input

The user will provide a feature idea, either as a brief description or a detailed request.

## Process

### 1. Research the Codebase

Before writing anything, understand what exists:

- Search `src/` for related code, types, tools, or bridge functions
- Read `docs/architecture/dependency-layers.md` for layer rules
- Check `docs/exec-plans/active/` for in-progress work that might overlap
- Review `initial-spec.md` for relevant spec details

### 2. Create the Design Document

Create `docs/design-docs/{feature-name}.md` using this template:

```markdown
# {Feature Name}

## Status
Draft — awaiting staff engineer review

## Problem
What problem are we solving? Why now? What's the user impact?

## Context
What exists today? What constraints do we have? What related code/docs exist?
Reference specific files: `src/...`, existing types, etc.

## Proposed Approach
How will we solve it? Include:
- Which layers are affected (Types, Styles, Bridge, Tools, Server)
- New files or modifications to existing ones
- Data flow through the layer stack
- Key TypeScript types and Zod schemas needed
- OmniGraffle automation patterns required
- Integration points with existing code

## Alternatives Considered
What else did we consider? Why did we reject each alternative?
At least 2 alternatives with clear trade-off analysis.

## macOS / OmniGraffle Considerations
- OmniGraffle API limitations or requirements
- macOS Automation permission implications
- Performance considerations for complex diagrams
- JXA scripting constraints

## Acceptance Criteria
Concrete, testable criteria. Each should be verifiable by a test or manual check.
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] ...

## Open Questions
What remains unresolved? Tag decisions that need staff engineer judgment.
- [ ] Question 1 — needs human decision because...
- [ ] Question 2 — blocked on...
```

### 3. Create GitHub Issue

```bash
gh issue create --title "Design: {Feature Name}" --label "design" --body "Design doc: docs/design-docs/{feature-name}.md

{one-line summary}"
```

### 4. Present for Review

After creating the design doc, present a summary to the staff engineer:

- One-paragraph summary of the proposed approach
- Key architectural decisions that need approval
- Open questions requiring human judgment
- Ask: "Should I proceed to create an execution plan with `/plan`, or do you want to revise the design first?"

## Rules

- Always research the codebase BEFORE writing the design doc
- Respect the layer architecture — proposed changes must follow the dependency rules
- Reference specific files and line numbers when discussing existing code
- Flag any proposed changes that would require new dependencies
- If the feature is ambiguous, escalate to the staff engineer
- Do NOT start implementation — this skill produces a design doc only
