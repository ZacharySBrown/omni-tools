/**
 * Deep merge utility for configuration objects.
 * Objects merge recursively, primitives are replaced, arrays are replaced entirely.
 */

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function deepMerge<T extends PlainObject>(
  base: T,
  ...overrides: Partial<T>[]
): T {
  const result = { ...base } as PlainObject;

  for (const override of overrides) {
    if (override === undefined || override === null) {
      continue;
    }
    for (const key of Object.keys(override)) {
      const baseVal = result[key];
      const overrideVal = (override as PlainObject)[key];

      if (overrideVal === undefined) {
        continue;
      }

      if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
        result[key] = deepMerge(baseVal, overrideVal);
      } else {
        result[key] = overrideVal;
      }
    }
  }

  return result as T;
}
