import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  loadPresetWithOverrides,
  loadPreset,
  listPresets,
  getPresetsDirs,
} from "../../src/styles/loader.js";
import { resetConfigCache } from "../../src/config/loader.js";

const PRESETS_DIR = path.join(process.cwd(), "presets");

describe("loadPresetWithOverrides", () => {
  let tmpDir: string;
  let originalConfigEnv: string | undefined;
  let originalPresetsEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "diagrammer-override-test-"),
    );
    originalConfigEnv = process.env.DIAGRAMMER_CONFIG;
    originalPresetsEnv = process.env.DIAGRAMMER_PRESETS_DIR;
    process.env.DIAGRAMMER_PRESETS_DIR = PRESETS_DIR;
    resetConfigCache();
  });

  afterEach(() => {
    if (originalConfigEnv === undefined) {
      delete process.env.DIAGRAMMER_CONFIG;
    } else {
      process.env.DIAGRAMMER_CONFIG = originalConfigEnv;
    }
    if (originalPresetsEnv === undefined) {
      delete process.env.DIAGRAMMER_PRESETS_DIR;
    } else {
      process.env.DIAGRAMMER_PRESETS_DIR = originalPresetsEnv;
    }
    resetConfigCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns base preset when no overrides", () => {
    // Point config to nonexistent file so no user overrides
    process.env.DIAGRAMMER_CONFIG = path.join(tmpDir, "none.yaml");

    const base = loadPreset("illustrated-technical");
    const result = loadPresetWithOverrides("illustrated-technical");
    expect(result).toEqual(base);
  });

  it("merges user config overrides into preset", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configPath,
      [
        "style_overrides:",
        "  layout:",
        "    margin: 99",
      ].join("\n"),
    );
    process.env.DIAGRAMMER_CONFIG = configPath;

    const result = loadPresetWithOverrides("illustrated-technical");
    expect(result.layout.margin).toBe(99);
    // Other values unchanged
    expect(result.meta.name).toBe("illustrated-technical");
  });

  it("per-call overrides win over user config", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configPath,
      [
        "style_overrides:",
        "  layout:",
        "    margin: 99",
      ].join("\n"),
    );
    process.env.DIAGRAMMER_CONFIG = configPath;

    const result = loadPresetWithOverrides("illustrated-technical", {
      layout: { margin: 42 },
    });
    expect(result.layout.margin).toBe(42);
  });

  it("throws validation error for invalid merged result", () => {
    // Point config to nonexistent file
    process.env.DIAGRAMMER_CONFIG = path.join(tmpDir, "none.yaml");

    expect(() =>
      loadPresetWithOverrides("illustrated-technical", {
        colors: { primary: 12345 }, // should be string
      }),
    ).toThrow();
  });
});

describe("multi-directory preset loading", () => {
  let tmpDir: string;
  let originalConfigEnv: string | undefined;
  let originalPresetsEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "diagrammer-multidir-test-"),
    );
    originalConfigEnv = process.env.DIAGRAMMER_CONFIG;
    originalPresetsEnv = process.env.DIAGRAMMER_PRESETS_DIR;
    resetConfigCache();
  });

  afterEach(() => {
    if (originalConfigEnv === undefined) {
      delete process.env.DIAGRAMMER_CONFIG;
    } else {
      process.env.DIAGRAMMER_CONFIG = originalConfigEnv;
    }
    if (originalPresetsEnv === undefined) {
      delete process.env.DIAGRAMMER_PRESETS_DIR;
    } else {
      process.env.DIAGRAMMER_PRESETS_DIR = originalPresetsEnv;
    }
    resetConfigCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds presets in custom dirs from user config", () => {
    const customDir = path.join(tmpDir, "custom-presets");
    fs.mkdirSync(customDir, { recursive: true });

    // Copy a preset to the custom dir with a new name
    const basePreset = JSON.parse(
      fs.readFileSync(
        path.join(PRESETS_DIR, "illustrated-technical.json"),
        "utf8",
      ),
    );
    basePreset.meta.name = "custom-preset";
    basePreset.meta.description = "A custom test preset";
    fs.writeFileSync(
      path.join(customDir, "custom-preset.json"),
      JSON.stringify(basePreset),
    );

    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configPath,
      `preset_dirs:\n  - ${customDir}\n`,
    );
    process.env.DIAGRAMMER_CONFIG = configPath;
    delete process.env.DIAGRAMMER_PRESETS_DIR;

    const preset = loadPreset("custom-preset");
    expect(preset.meta.name).toBe("custom-preset");
  });

  it("getPresetsDirs includes all sources", () => {
    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configPath,
      "preset_dirs:\n  - /tmp/user-presets\n",
    );
    process.env.DIAGRAMMER_CONFIG = configPath;
    process.env.DIAGRAMMER_PRESETS_DIR = "/tmp/env-presets";

    const dirs = getPresetsDirs();
    expect(dirs[0]).toBe("/tmp/user-presets");
    expect(dirs[1]).toBe("/tmp/env-presets");
    expect(dirs[2]).toContain("presets");
  });

  it("user dirs presets win over built-in in listPresets", () => {
    const customDir = path.join(tmpDir, "custom-presets");
    fs.mkdirSync(customDir, { recursive: true });

    // Create a preset with same name as built-in but different desc
    const basePreset = JSON.parse(
      fs.readFileSync(
        path.join(PRESETS_DIR, "illustrated-technical.json"),
        "utf8",
      ),
    );
    basePreset.meta.description = "User override version";
    fs.writeFileSync(
      path.join(customDir, "illustrated-technical.json"),
      JSON.stringify(basePreset),
    );

    const configPath = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configPath,
      `preset_dirs:\n  - ${customDir}\n`,
    );
    process.env.DIAGRAMMER_CONFIG = configPath;
    process.env.DIAGRAMMER_PRESETS_DIR = PRESETS_DIR;

    const presets = listPresets();
    const it = presets.find(
      (p) => p.name === "illustrated-technical",
    );
    expect(it).toBeDefined();
    expect(it!.description).toBe("User override version");
  });
});
