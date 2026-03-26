# /cleanup — Entropy Management and Pattern Drift Detection

## Role
Before beginning, read `.claude/agents/operator.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are scanning the codebase for pattern drift, stale docs, and tech debt. Follow these steps precisely.

## Process

### 1. Run Quality Checks

First, get the current quality state:

```bash
npx tsc --noEmit 2>&1
npx eslint . 2>&1
```

### 2. Detect Pattern Drift

Scan for inconsistencies across the codebase:

- **Duplicate code**: Similar functions across tool modules
- **Inconsistent naming**: Files/exports that don't follow conventions
- **Mixed patterns**: Some tools using one approach, others using different
- **Orphaned code**: Types or functions with no references
- **Oversized files**: Files exceeding 250 lines
- **Console.log drift**: `console.log` appearing in production code
- **Any type drift**: `any` types creeping into strict TypeScript code
- **JXA pattern inconsistency**: Different bridge functions using different script generation approaches

### 3. Check Doc Freshness

For every file in `docs/`:
- Check if it references files/modules that no longer exist
- Check if it describes behavior that has changed
- Check if exec plans in `docs/exec-plans/active/` are actually still active
- Check if completed plans should be moved to `docs/exec-plans/completed/`

### 4. Identify Tech Debt

Check open GitHub Issues labeled "tech-debt":
- Are listed items still relevant?
- Are there new debt items not yet tracked?
- Have any items been resolved but not closed?

### 5. Report Findings

```markdown
## Cleanup Report

### Pattern Drift
- {file}: {description of inconsistency}
- ...

### Stale Documentation
- {doc file}: {what's stale and why}
- ...

### New Tech Debt
- {description}: {affected files} — suggested priority: P{0-3}
- ...

### Resolved Issues
- GH#{number}: appears to be fixed, should be closed
- ...

### Proposed Fixes
1. **{Fix title}**: {what to change, which files} — estimated effort: {small/medium/large}
2. ...
```

### 6. Create GitHub Issues

For each significant finding:

```bash
gh issue create --title "{Fix title}" --label "tech-debt" --body "{description}"
```

Ask the staff engineer: "I found {N} issues. Should I create fix PRs for the small ones, or just track everything as GitHub Issues?"

## Rules

- Focus on mechanical, objective drift — not subjective style preferences
- Prioritize findings by impact on user experience and developer productivity
- Small fixes (typos, stale references) can be batched
- Large changes (refactors, architectural shifts) need design docs first
- Always file GitHub Issues for new findings
- Don't fix things silently — report first, then fix with approval
