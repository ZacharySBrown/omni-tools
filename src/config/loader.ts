import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import { UserConfigSchema, DEFAULT_USER_CONFIG, type UserConfig } from "./schema.js";

const DEFAULT_CONFIG_PATH = path.join(
  process.env.HOME || "~",
  ".diagrammer",
  "config.yaml",
);

let cachedConfig: UserConfig | null = null;

function getConfigPath(): string {
  return process.env.DIAGRAMMER_CONFIG || DEFAULT_CONFIG_PATH;
}

export function loadUserConfig(): UserConfig {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    cachedConfig = { ...DEFAULT_USER_CONFIG };
    return cachedConfig;
  }

  const raw = fs.readFileSync(configPath, "utf8");

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Invalid YAML in config file ${configPath}: ${message}`,
    );
  }

  // Empty YAML files parse as null
  if (parsed === null || parsed === undefined) {
    cachedConfig = { ...DEFAULT_USER_CONFIG };
    return cachedConfig;
  }

  const result = UserConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid config in ${configPath}: ${result.error.message}`,
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function getUserConfig(): UserConfig {
  return loadUserConfig();
}

/**
 * Reset the cached config. Used for testing.
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
