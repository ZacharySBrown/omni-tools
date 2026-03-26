# /plan — Create an Execution Plan from a Design Document

## Role
Before beginning, read `.claude/agents/architect.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are decomposing a design document into an ordered execution plan with concrete tasks. Follow these steps precisely.

## Input

The user will reference a design document, either by name or path (e.g., `docs/design-docs/feature-name.md`).

## Process

### 1. Read the Design Document

- Read the referenced design doc in full
- Verify its status is approved or at least reviewed
- If the design doc is still "Draft" status, warn the staff engineer and ask if they want to proceed anyway

### 2. Read Architecture Context

- Read `docs/architecture/dependency-layers.md` for layer rules
- Check `docs/exec-plans/active/` for conflicting in-progress plans

### 3. Decompose into Tasks

Break the design into ordered steps. Each task should:

- Be completable in a single focused session
- Have clear inputs (what files/modules to read) and outputs (what files to create/modify)
- Have explicit dependencies on other tasks
- Include a TDD checkpoint: what test to write first

Organize tasks by layer, bottom-up:
1. **Types first** — Interfaces, Zod schemas, enums
2. **Styles** — Preset loading, token schema
3. **Bridge** — OmniGraffle JXA automation helpers
4. **Tools** — MCP tool implementations
5. **Server** — Registration, transport setup
6. **Tests** — Unit and integration tests
7. **Docs** — Architecture and layer doc updates

### 4. Create the Execution Plan

Create `docs/exec-plans/active/{plan-name}.md` using this template:

```markdown
# Execution Plan: {Feature Name}

## Design Doc
[{Feature Name}](../../design-docs/{feature-name}.md)

## Status
Active — {N} tasks remaining

## Task Breakdown

### Task 1: {Description}
- **Layer**: Types
- **Depends on**: (none)
- **Files**: `src/types/{file}.ts`
- **TDD**: Write test for {what} first, then implement
- **Done when**: {concrete criterion}
- **Status**: [ ] pending

### Task 2: {Description}
- **Layer**: Bridge
- **Depends on**: Task 1
- **Files**: `src/bridge/{file}.ts`
- **TDD**: Write test for {what} first, then implement
- **Done when**: {concrete criterion}
- **Status**: [ ] pending

... (continue for all tasks)

## Decision Log

| Decision | Date | Context |
|----------|------|---------|
| *(decisions made during execution go here)* | | |

## Risks

- Risk 1: {description} — mitigation: {approach}
- Risk 2: {description} — mitigation: {approach}
```

### 5. Create GitHub Issues

For each task in the plan, create a GitHub Issue:

```bash
gh issue create --title "Task {N}: {description}" --label "task" --body "Part of exec plan: docs/exec-plans/active/{plan-name}.md

**Layer**: {layer}
**Depends on**: {dependencies}
**TDD**: {test checkpoint}
**Done when**: {criterion}"
```

### 6. Present for Approval

Present the plan to the staff engineer with:

- Total task count and estimated complexity
- Critical path (which tasks block the most others)
- First 2-3 tasks that can start immediately (no dependencies)
- Any risks or open questions
- Ask: "Does this plan look right? Should I adjust the task breakdown or ordering?"

## Rules

- Every task must have a TDD checkpoint
- Tasks must respect the layer dependency order (build bottom-up)
- Keep tasks small enough to complete in one session
- Each task must have a clear "done when" criterion
- Flag any tasks that require staff engineer judgment
- Do NOT start implementation — this skill produces a plan only
- If the design doc has unresolved open questions, escalate before planning
