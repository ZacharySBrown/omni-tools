import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  loadUserConfig,
  resetConfigCache,
} from "../../src/config/loader.js";

describe("loadUserConfig", () => {
  let tmpDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diagrammer-test-"));
    originalEnv = process.env.DIAGRAMMER_CONFIG;
    resetConfigCache();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DIAGRAMMER_CONFIG;
    } else {
      process.env.DIAGRAMMER_CONFIG = originalEnv;
    }
    resetConfigCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    process.env.DIAGRAMMER_CONFIG = path.join(tmpDir, "nonexistent.yaml");
    const config = loadUserConfig();
    expect(config).toEqual({});
  });

  it("loads and parses valid YAML config", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configPath,
      [
        "default_preset: clean-academic",
        "preset_dirs:",
        "  - /tmp/my-presets",
        "style_overrides:",
        "  colors:",
        "    primary: '#FF0000'",
      ].join("\n"),
    );
    process.env.DIAGRAMMER_CONFIG = configPath;

    const config = loadUserConfig();
    expect(config.default_preset).toBe("clean-academic");
    expect(config.preset_dirs).toEqual(["/tmp/my-presets"]);
    expect(config.style_overrides?.colors?.primary).toBe("#FF0000");
  });

  it("caches config (singleton behavior)", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(configPath, "default_preset: first-load\n");
    process.env.DIAGRAMMER_CONFIG = configPath;

    const first = loadUserConfig();
    expect(first.default_preset).toBe("first-load");

    // Overwrite file — should still get cached value
    fs.writeFileSync(configPath, "default_preset: second-load\n");
    const second = loadUserConfig();
    expect(second.default_preset).toBe("first-load");
    expect(second).toBe(first); // Same reference
  });

  it("throws on invalid YAML", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(configPath, "{{{{not valid yaml");
    process.env.DIAGRAMMER_CONFIG = configPath;

    expect(() => loadUserConfig()).toThrow("Invalid YAML");
  });

  it("handles empty YAML file", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(configPath, "");
    process.env.DIAGRAMMER_CONFIG = configPath;

    const config = loadUserConfig();
    expect(config).toEqual({});
  });
});
