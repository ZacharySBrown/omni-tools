import { execFileSync, execSync } from "child_process";
import * as fs from "fs";
import type { BridgeResult } from "../types/bridge.js";

export function runOmniJS(script: string, timeoutMs = 30000): BridgeResult {
  try {
    const output = execFileSync("osascript", ["-l", "JavaScript", "-e", script], {
      timeout: timeoutMs,
      encoding: "utf8",
    });
    return { success: true, output: output.trim() };
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    return {
      success: false,
      error: e.stderr || e.message || "Unknown osascript error",
    };
  }
}

export function runOmniJSFile(script: string, timeoutMs = 60000): BridgeResult {
  const tmpPath = `/tmp/diagrammer_${Date.now()}.js`;
  try {
    fs.writeFileSync(tmpPath, script, "utf8");
    const output = execFileSync("osascript", ["-l", "JavaScript", tmpPath], {
      timeout: timeoutMs,
      encoding: "utf8",
    });
    return { success: true, output: output.trim() };
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    return {
      success: false,
      error: e.stderr || e.message || "Unknown osascript error",
    };
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
