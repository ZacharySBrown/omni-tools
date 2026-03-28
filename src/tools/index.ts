import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreateDiagramInputSchema } from "../types/diagram.js";
import { ExportDiagramInputSchema } from "../types/diagram.js";
import { ListStylePresetsInputSchema } from "../types/diagram.js";
import { FetchXkcdInputSchema } from "../types/xkcd.js";
import { createDiagramTool } from "./create-diagram.js";
import { exportDiagramTool } from "./export-diagram.js";
import { listStylePresetsTool } from "./list-style-presets.js";
import { fetchXkcdTool } from "./fetch-xkcd.js";

export function registerAllTools(server: McpServer): void {
  server.tool(
    createDiagramTool.name,
    createDiagramTool.description,
    CreateDiagramInputSchema.shape,
    async (params) => createDiagramTool.execute(params),
  );

  server.tool(
    exportDiagramTool.name,
    exportDiagramTool.description,
    ExportDiagramInputSchema.shape,
    async (params) => exportDiagramTool.execute(params),
  );

  server.tool(
    listStylePresetsTool.name,
    listStylePresetsTool.description,
    ListStylePresetsInputSchema.shape,
    async (params) => listStylePresetsTool.execute(params),
  );

  server.tool(
    fetchXkcdTool.name,
    fetchXkcdTool.description,
    FetchXkcdInputSchema.shape,
    async (params) => fetchXkcdTool.execute(params),
  );
}
