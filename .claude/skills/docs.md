# /docs — Validate and Report on Project Documentation

## Role
Before beginning, read `.claude/agents/operator.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are validating and reporting on the project's documentation. Follow these steps precisely.

## Input

The user may specify a sub-command:

- `/docs` or `/docs check` — Validate docs and report status
- `/docs coverage` — Report which modules have doc comments and which are missing

If no sub-command is given, default to `check`.

## Process

### 1. Check Documentation Structure

Verify all expected documentation files exist:

- `docs/architecture/dependency-layers.md`
- `docs/design-docs/` (directory exists)
- `docs/exec-plans/active/` (directory exists)
- `initial-spec.md`

### 2. Check Doc Comment Coverage

Scan `src/` for exported types and functions:

- List every exported function, class, type, and const
- For each, check if it has a `/** ... */` JSDoc comment
- Report coverage as a percentage per layer

```markdown
## Doc Comment Coverage

| Layer | Exports | Documented | Coverage |
|-------|---------|------------|----------|
| Types | 6 | 6 | 100% |
| Styles | 3 | 2 | 67% |
| Bridge | 4 | 4 | 100% |
| Tools | 9 | 9 | 100% |
| Server | 1 | 1 | 100% |
| **Total** | **23** | **22** | **96%** |
```

### 3. Check Doc Freshness

For each file in `docs/`:
- Compare the last-modified date of the doc against the code it documents
- Flag docs where the corresponding code has been modified more recently

### 4. Validate Internal Links

Scan all markdown files in `docs/` for:
- Broken relative links (references to files that don't exist)
- References to code files that have been moved or deleted

### 5. Present Report

```markdown
## Documentation Report

### Structure
- **Result**: PASS / FAIL (missing expected files)
- **Missing**: {list of missing docs}

### Doc Comment Coverage
{coverage table from step 2}

### Doc Freshness
- {doc}: last updated {date}, code updated {date} — **STALE**
- ...

### Broken Links
- {file}:{line} — link to `{target}` is broken
- ...

### Recommendations
1. {Actionable recommendation}
2. ...
```

### 6. Create GitHub Issues (if issues found)

For significant documentation gaps:

```bash
gh issue create --title "Docs: {description}" --label "docs" --body "{details}"
```

## Rules

- Report coverage honestly — don't count empty doc comments as documented
- Never auto-fix documentation content — report gaps and let the Engineer fill them
- Flag modules with 0% documentation coverage as priority items
