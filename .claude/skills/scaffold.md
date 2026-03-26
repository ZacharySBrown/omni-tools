# /scaffold — Create a New Tool Module

## Role
Before beginning, read `.claude/agents/engineer.md` and adopt that role's persona,
constraints, and focus areas for this task.

You are creating a new MCP tool module following the 5-layer stack with test stubs and doc placeholders. Follow these steps precisely.

## Input

The user will provide a tool name and brief description (e.g., "create_diagram — create OmniGraffle diagram from structured spec").

## Process

### 1. Validate the Tool Name

- Must be snake_case (MCP tool convention)
- Must not conflict with existing tools in `src/tools/`
- Check `initial-spec.md` for the tool's specification

### 2. Create Layer Files

For each relevant layer, create the module. Not every tool needs every layer.

**Types (Layer 1)**
```typescript
// src/types/{toolName}.ts
import { z } from "zod";

export const {ToolName}InputSchema = z.object({
  // Define input fields from spec
});

export type {ToolName}Input = z.infer<typeof {ToolName}InputSchema>;

export const {ToolName}OutputSchema = z.object({
  // Define output fields
});

export type {ToolName}Output = z.infer<typeof {ToolName}OutputSchema>;
```

**Bridge (Layer 3)** — if the tool needs OmniGraffle interaction
```typescript
// src/bridge/{toolName}.ts
import type { {ToolName}Input } from "../types/{toolName}.js";

export async function {toolName}Bridge(input: {ToolName}Input): Promise<void> {
  // JXA script generation and execution
}
```

**Tool (Layer 4)**
```typescript
// src/tools/{toolName}.ts
import { {ToolName}InputSchema } from "../types/{toolName}.js";
import { {toolName}Bridge } from "../bridge/{toolName}.js";

export const {toolName}Tool = {
  name: "{tool_name}",
  description: "{Tool description from spec}",
  inputSchema: {ToolName}InputSchema,
  async execute(input: unknown) {
    const validated = {ToolName}InputSchema.parse(input);
    // Implementation
  },
};
```

### 3. Create Test Stubs

```typescript
// tests/tools/{toolName}.test.ts
import { describe, it, expect } from "vitest";
import { {ToolName}InputSchema } from "../../src/types/{toolName}.js";

describe("{tool_name}", () => {
  it("validates correct input", () => {
    const input = {
      // Valid test input
    };
    expect(() => {ToolName}InputSchema.parse(input)).not.toThrow();
  });

  it("rejects invalid input", () => {
    expect(() => {ToolName}InputSchema.parse({})).toThrow();
  });
});
```

### 4. Create GitHub Issue

```bash
gh issue create --title "Implement {tool_name} tool" --body "Scaffolded module for {tool_name}.

Files created:
- src/types/{toolName}.ts
- src/bridge/{toolName}.ts (if needed)
- src/tools/{toolName}.ts
- tests/tools/{toolName}.test.ts

Next: fill in implementation following TDD."
```

### 5. Verify

Run checks to ensure the new module compiles:

```bash
npx tsc --noEmit
```

### 6. Present Summary

Tell the staff engineer:
- What files were created (list all)
- How to start implementing: "Pick up the GitHub Issue and start with the Types layer"
- Suggest running `/plan` if the tool is complex enough to need a multi-task breakdown

## Rules

- Follow TypeScript/MCP naming conventions (snake_case for tool names, PascalCase for types)
- Every tool must have a Zod input schema
- Every tool must have at least a basic test stub
- Bridge functions must not interpolate untrusted input into JXA scripts
- Test stubs must actually compile (not just be placeholders)
- Run type check before presenting results
- Do NOT implement business logic — create the skeleton only
