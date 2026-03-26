import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as child_process from "child_process";
import { runOmniJS, runOmniJSFile } from "../../src/bridge/execute.js";

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof fs>("fs");
  return {
    ...actual,
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

const mockExecFileSync = vi.mocked(child_process.execFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runOmniJS", () => {
  it("returns success with output on successful execution", () => {
    mockExecFileSync.mockReturnValue("hello world\n");
    const result = runOmniJS('Application("OmniGraffle").name()');
    expect(result.success).toBe(true);
    expect(result.output).toBe("hello world");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "osascript",
      ["-l", "JavaScript", "-e", 'Application("OmniGraffle").name()'],
      expect.objectContaining({ timeout: 30000 }),
    );
  });

  it("returns failure with error on execution error", () => {
    mockExecFileSync.mockImplementation(() => {
      const err = new Error("script failed") as Error & { stderr: string };
      err.stderr = "execution error: OmniGraffle got an error";
      throw err;
    });
    const result = runOmniJS("bad script");
    expect(result.success).toBe(false);
    expect(result.error).toContain("OmniGraffle got an error");
  });

  it("uses custom timeout", () => {
    mockExecFileSync.mockReturnValue("ok");
    runOmniJS("test", 5000);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "osascript",
      expect.any(Array),
      expect.objectContaining({ timeout: 5000 }),
    );
  });
});

describe("runOmniJSFile", () => {
  it("writes script to temp file and executes", () => {
    mockExecFileSync.mockReturnValue("done:/path/to/doc\n");
    const result = runOmniJSFile("var og = Application('OmniGraffle');");
    expect(result.success).toBe(true);
    expect(result.output).toBe("done:/path/to/doc");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("/tmp/diagrammer_"),
      "var og = Application('OmniGraffle');",
      "utf8",
    );
  });

  it("cleans up temp file after execution", () => {
    mockExecFileSync.mockReturnValue("ok");
    runOmniJSFile("test script");
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("cleans up temp file even on error", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("failed");
    });
    runOmniJSFile("bad script");
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("returns failure on error", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("timeout");
    });
    const result = runOmniJSFile("slow script");
    expect(result.success).toBe(false);
    expect(result.error).toContain("timeout");
  });
});
