import * as fs from "fs";
import * as path from "path";
import { StyleTokensSchema, type StyleTokens } from "../types/styles.js";

function getPresetsDir(): string {
  return process.env.DIAGRAMMER_PRESETS_DIR || path.join(process.cwd(), "presets");
}

export function loadPreset(name: string): StyleTokens {
  const presetsDir = getPresetsDir();
  const filePath = path.join(presetsDir, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Style preset not found: ${name} (looked in ${presetsDir})`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return StyleTokensSchema.parse(raw);
}

export interface PresetInfo {
  name: string;
  description: string;
  version: string;
}

export function listPresets(): PresetInfo[] {
  const presetsDir = getPresetsDir();

  if (!fs.existsSync(presetsDir)) {
    return [];
  }

  const files = fs.readdirSync(presetsDir).filter((f) => f.endsWith(".json"));
  const presets: PresetInfo[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(presetsDir, file), "utf8"));
      const parsed = StyleTokensSchema.parse(raw);
      presets.push({
        name: parsed.meta.name,
        description: parsed.meta.description,
        version: parsed.meta.version,
      });
    } catch {
      // Skip invalid preset files
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
