import * as fs from "fs";
import * as path from "path";
import { StyleTokensSchema, type StyleTokens } from "../types/styles.js";
import { getUserConfig } from "../config/loader.js";
import { deepMerge } from "../config/merge.js";

function getBuiltinPresetsDir(): string {
  return path.join(process.cwd(), "presets");
}

export function getPresetsDirs(): string[] {
  const dirs: string[] = [];

  // User config preset_dirs (highest priority)
  const config = getUserConfig();
  if (config.preset_dirs) {
    dirs.push(...config.preset_dirs);
  }

  // DIAGRAMMER_PRESETS_DIR env var
  if (process.env.DIAGRAMMER_PRESETS_DIR) {
    dirs.push(process.env.DIAGRAMMER_PRESETS_DIR);
  }

  // Built-in presets/ directory (lowest priority)
  dirs.push(getBuiltinPresetsDir());

  return dirs;
}

export function loadPreset(name: string): StyleTokens {
  const dirs = getPresetsDirs();

  for (const dir of dirs) {
    const filePath = path.join(dir, `${name}.json`);
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return StyleTokensSchema.parse(raw);
    }
  }

  throw new Error(
    `Style preset not found: ${name} (searched: ${dirs.join(", ")})`,
  );
}

export function loadPresetWithOverrides(
  name: string,
  perCallOverrides?: Record<string, unknown>,
): StyleTokens {
  const base = loadPreset(name);
  const config = getUserConfig();

  let merged = base as Record<string, unknown>;

  if (config.style_overrides) {
    merged = deepMerge(
      merged,
      config.style_overrides as Record<string, unknown>,
    );
  }

  if (perCallOverrides) {
    merged = deepMerge(merged, perCallOverrides);
  }

  return StyleTokensSchema.parse(merged);
}

export interface PresetInfo {
  name: string;
  description: string;
  version: string;
}

export function listPresets(): PresetInfo[] {
  const dirs = getPresetsDirs();
  const seen = new Set<string>();
  const presets: PresetInfo[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const raw = JSON.parse(
          fs.readFileSync(path.join(dir, file), "utf8"),
        );
        const parsed = StyleTokensSchema.parse(raw);
        if (!seen.has(parsed.meta.name)) {
          seen.add(parsed.meta.name);
          presets.push({
            name: parsed.meta.name,
            description: parsed.meta.description,
            version: parsed.meta.version,
          });
        }
      } catch {
        // Skip invalid preset files
      }
    }
  }

  return presets;
}

export function resolveSemanticColor(
  preset: StyleTokens,
  role: string,
): string {
  const roles = preset.semantic_roles as Record<string, string>;
  const colorKey = roles[role] ?? "surface";
  const colors = preset.colors as Record<string, string>;
  return colors[colorKey] ?? preset.colors.surface;
}

export function resolveTextColor(
  preset: StyleTokens,
  role: string,
): string {
  const darkRoles = ["encoder", "decoder", "attention", "output"];
  return darkRoles.includes(role)
    ? preset.colors.text_on_primary
    : preset.colors.text_primary;
}
