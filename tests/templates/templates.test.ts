import { describe, it, expect } from "vitest";
import { diagramTemplates, getTemplate, listTemplates } from "../../src/templates/index.js";
import { NodeSchema, ConnectionSchema } from "../../src/types/diagram.js";

describe("diagram templates", () => {
  it("has at least 4 templates", () => {
    expect(diagramTemplates.length).toBeGreaterThanOrEqual(4);
  });

  it("each template has required fields", () => {
    for (const t of diagramTemplates) {
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.nodes.length).toBeGreaterThan(0);
      expect(t.connections.length).toBeGreaterThan(0);
    }
  });

  it("all template nodes pass Zod validation", () => {
    for (const t of diagramTemplates) {
      for (const node of t.nodes) {
        expect(() => NodeSchema.parse(node)).not.toThrow();
      }
    }
  });

  it("all template connections pass Zod validation", () => {
    for (const t of diagramTemplates) {
      for (const conn of t.connections) {
        expect(() => ConnectionSchema.parse(conn)).not.toThrow();
      }
    }
  });

  it("all connections reference valid node IDs", () => {
    for (const t of diagramTemplates) {
      const nodeIds = new Set(t.nodes.map((n) => n.id));
      for (const conn of t.connections) {
        expect(nodeIds.has(conn.from)).toBe(true);
        expect(nodeIds.has(conn.to)).toBe(true);
      }
    }
  });
});

describe("getTemplate", () => {
  it("returns template by name", () => {
    const t = getTemplate("experiment-loop");
    expect(t).toBeDefined();
    expect(t!.name).toBe("experiment-loop");
  });

  it("returns undefined for unknown name", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });
});

describe("listTemplates", () => {
  it("returns name and description for each template", () => {
    const list = listTemplates();
    expect(list.length).toBeGreaterThanOrEqual(4);
    for (const entry of list) {
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
    }
  });
});
