import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import * as path from "path";

const SERVER_PATH = path.join(process.cwd(), "dist", "index.js");

/**
 * Send a JSON-RPC message to the MCP server and get a response.
 * Starts the server as a subprocess, communicates via stdin/stdout.
 */
function sendMcpRequest(method: string, params: Record<string, unknown> = {}, id = 1): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [SERVER_PATH], {
      env: { ...process.env, DIAGRAMMER_PRESETS_DIR: path.join(process.cwd(), "presets") },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", () => { /* suppress */ });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Server timed out"));
    }, 10000);

    // MCP protocol: first initialize, then send request
    const initMsg = JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    } }) + "\n";

    proc.stdin.write(initMsg);

    // Wait for init response, then send actual request
    setTimeout(() => {
      const reqMsg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      proc.stdin.write(reqMsg);

      // Give server time to respond
      setTimeout(() => {
        proc.kill();
        clearTimeout(timeout);
        // Parse responses — find the one matching our request id
        const lines = stdout.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.id === id) {
              resolve(parsed);
              return;
            }
          } catch { /* skip non-JSON lines */ }
        }
        reject(new Error(`No response for id=${id}. Got: ${stdout.slice(0, 500)}`));
      }, 1000);
    }, 500);
  });
}

describe("MCP server resources (protocol-level)", () => {
  it("reads a diagram template resource", async () => {
    const resp = await sendMcpRequest("resources/read", {
      uri: "template://diagram/experiment-loop",
    }, 2);

    expect(resp.result).toBeDefined();
    const result = resp.result as { contents: Array<{ uri: string; mimeType: string; text: string }> };
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe("application/json");
    expect(result.contents[0].uri).toBe("template://diagram/experiment-loop");

    const template = JSON.parse(result.contents[0].text);
    expect(template.name).toBe("experiment-loop");
    expect(template.nodes.length).toBeGreaterThan(0);
    expect(template.connections.length).toBeGreaterThan(0);
  }, 15000);

  it("returns error for unknown template", async () => {
    const resp = await sendMcpRequest("resources/read", {
      uri: "template://diagram/nonexistent",
    }, 3);

    expect(resp.error).toBeDefined();
  }, 15000);
});
