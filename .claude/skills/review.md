# /review — Structured Code Review

## Role
Before beginning, read `.claude/agents/reviewer.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are performing a structured code review. Check the build, classify findings as CRITICAL or ADVISORY, and produce a clear checklist. Follow these steps precisely.

## Input

The user will indicate what to review — typically recent changes, a specific file, or a PR.

## Process

### 1. Identify Changed Files

Determine what to review:
- If given a file path, review that file
- If asked to review recent changes, run `git diff` and `git diff --cached` to find changed files
- If given a PR number, use `gh pr diff {number}` to get the changes

### 2. Verify Build

```bash
npx tsc --noEmit
```

### 3. Run Linters

```bash
npx eslint . 2>&1
```

If ESLint is not configured yet, note this and proceed with manual review.

### 4. Check Layer Compliance

For each changed file, verify:
- Types don't import from Styles, Bridge, Tools, or Server
- Styles don't import from Bridge, Tools, or Server
- Bridge doesn't import from Tools or Server
- Tools don't import from Server
- No circular dependencies within a layer

### 5. Check Safety

For each changed file:
- No `console.log` in production code
- No `any` types without justification
- No `@ts-ignore` without justification
- No string interpolation of untrusted input into `osascript` commands
- No hardcoded secrets or API keys
- Zod validation present for all external inputs

### 6. Check Test Coverage

For each changed file in `src/`:
- Determine the corresponding test file in `tests/`
- Check if tests exist for new/modified exported functions
- Flag any new code without corresponding tests

### 7. Produce Review Checklist

```markdown
## Review Results

### CRITICAL (blocks merge)

These must be fixed before merging:

- [ ] **Layer violation**: {file}:{line} — {description}
- [ ] **Missing tests**: {file} — new export `{name}` has no tests
- [ ] **JXA safety**: {file}:{line} — untrusted input interpolated into osascript
- [ ] **Missing Zod validation**: {file} — tool input not validated
- [ ] **Build failure**: {description}

### ADVISORY (suggest, don't block)

These are recommendations but won't block merge:

- [ ] **Style**: {description}
- [ ] **Doc freshness**: {file} changed but docs not updated
- [ ] **Naming**: {description}
- [ ] **File size**: {file} exceeds 250 lines

### Summary

- Critical issues: {count}
- Advisory issues: {count}
- Verdict: **PASS** / **FAIL** (fail if any critical issues)
```

### 8. Post to PR (if reviewing a PR)

```bash
gh pr comment {number} --body "{review checklist from step 7}"
```

## Classification Rules

### CRITICAL (blocks merge)
- Layer dependency violations (backward imports)
- Missing tests for new exported functions
- Build errors (TypeScript strict mode)
- JXA shell injection vectors
- Missing Zod validation at tool boundaries
- Security issues (hardcoded secrets)

### ADVISORY (suggest, don't block)
- ESLint style issues
- Missing or stale documentation
- Naming convention deviations
- `console.log` in production code
- File size over 250 lines
- Missing doc comments on internal functions
- Use of `any` type (should be narrowed)

## Rules

- Always verify the build compiles — don't skip
- Be specific: include file paths, line numbers, function names
- For each critical issue, include a concrete remediation suggestion
- The staff engineer can override critical issues — note this in the summary
- If there are zero critical issues, the verdict is PASS
- Do NOT fix issues — only report them. The implementer fixes.
