import { describe, it, expect } from "vitest";
import { deepMerge } from "../../src/config/merge.js";

describe("deepMerge", () => {
  it("merges objects recursively", () => {
    const base = { a: { b: 1, c: 2 } };
    const override = { a: { b: 10 } };
    const result = deepMerge(base, override);
    expect(result).toEqual({ a: { b: 10, c: 2 } });
  });

  it("later values win for primitives", () => {
    const base = { x: "hello", y: 42 };
    const override = { x: "world" };
    const result = deepMerge(base, override);
    expect(result.x).toBe("world");
    expect(result.y).toBe(42);
  });

  it("arrays replace entirely", () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4, 5] };
    const result = deepMerge(base, override);
    expect(result.items).toEqual([4, 5]);
  });

  it("nested objects merge correctly", () => {
    const base = {
      colors: { primary: "#000", secondary: "#111" },
      layout: { margin: 10, padding: 20 },
    };
    const override = {
      colors: { primary: "#FFF" },
    };
    const result = deepMerge(base, override);
    expect(result.colors.primary).toBe("#FFF");
    expect(result.colors.secondary).toBe("#111");
    expect(result.layout.margin).toBe(10);
  });

  it("handles undefined/null overrides gracefully", () => {
    const base = { a: 1, b: 2 };
    const result1 = deepMerge(base, undefined as any);
    expect(result1).toEqual({ a: 1, b: 2 });

    const result2 = deepMerge(base, null as any);
    expect(result2).toEqual({ a: 1, b: 2 });
  });

  it("skips undefined values in override keys", () => {
    const base = { a: 1, b: 2 };
    const override = { a: undefined, b: 3 };
    const result = deepMerge(base, override);
    expect(result.a).toBe(1);
    expect(result.b).toBe(3);
  });

  it("applies multiple overrides in sequence", () => {
    const base = { a: 1, b: 2, c: 3 };
    const first = { a: 10 };
    const second = { b: 20 };
    const third = { a: 100 };
    const result = deepMerge(base, first, second, third);
    expect(result).toEqual({ a: 100, b: 20, c: 3 });
  });

  it("handles null values as replacements", () => {
    const base = { a: { nested: true } };
    const override = { a: null };
    const result = deepMerge(base, override as any);
    expect(result.a).toBeNull();
  });

  it("does not mutate the base object", () => {
    const base = { a: { b: 1 } };
    const override = { a: { b: 2 } };
    deepMerge(base, override);
    expect(base.a.b).toBe(1);
  });
});
