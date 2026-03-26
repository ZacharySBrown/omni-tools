# /quality — Run Quality Scoring

## Role
Before beginning, read `.claude/agents/operator.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are generating quality scores for every layer of the project. Follow these steps precisely.

## Process

### 1. Verify Build

```bash
npx tsc --noEmit 2>&1
```

### 2. Run Tests

```bash
npm test 2>&1
```

Collect: total tests, passed, failed, errors.

### 3. Run Linters

```bash
npx eslint . 2>&1
```

### 4. Manual Quality Checks

For each layer directory (types, styles, bridge, tools, server):

- **Layer compliance**: Check imports for backward dependencies
- **Console.log audit**: Grep for `console.log` in production code
- **Any type audit**: Grep for `: any` or `as any` usage
- **Zod coverage**: Check if exported tool inputs have Zod schemas
- **Doc coverage**: Check if exported functions have JSDoc comments
- **File sizes**: Check for files exceeding 250 lines
- **Test coverage**: Check if corresponding test files exist

### 5. Score Each Layer

| Criterion | Weight | How to Score |
|-----------|--------|-------------|
| Build success | 20% | Compiles with zero TypeScript errors |
| Test coverage | 25% | Test files exist for exported modules |
| Layer compliance | 20% | Zero backward imports |
| Safety | 15% | No console.log, no unsafe JXA, Zod at boundaries |
| Doc coverage | 10% | Exported functions have JSDoc comments |
| File hygiene | 10% | Files under 250 lines, proper naming |

Grade scale:
- **A**: 90-100% — Excellent
- **B**: 75-89% — Good
- **C**: 60-74% — Needs improvement
- **D**: 40-59% — Significant issues
- **F**: Below 40% — Failing
- **N/A**: No code in this layer yet

### 6. Present Summary

Output:
- Overall project health (average grade)
- Regressions (if any, compared to previous run)
- Top 3 areas needing improvement
- Specific action items for the lowest-scoring layers

## Rules

- Score every layer, even if it has no code (mark as N/A)
- Be honest — don't inflate scores
- Regressions are the highest-priority finding
- Suggest specific, actionable improvements (not vague "improve testing")
