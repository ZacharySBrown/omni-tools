import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CreateDiagramInputSchema,
  ExportDiagramInputSchema,
  ListStylePresetsInputSchema,
  ApplyStylePresetInputSchema,
  AddElementInputSchema,
  ExtractStyleInputSchema,
} from "../types/diagram.js";
import { createDiagramTool } from "./create-diagram.js";
import { exportDiagramTool } from "./export-diagram.js";
import { listStylePresetsTool } from "./list-style-presets.js";
import { applyStylePresetTool } from "./apply-style-preset.js";
import { addElementTool } from "./add-element.js";
import { extractStyleTool } from "./extract-style.js";

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
    applyStylePresetTool.name,
    applyStylePresetTool.description,
    ApplyStylePresetInputSchema.shape,
    async (params) => applyStylePresetTool.execute(params),
  );

  server.tool(
    addElementTool.name,
    addElementTool.description,
    AddElementInputSchema.shape,
    async (params) => addElementTool.execute(params),
  );

  server.tool(
    extractStyleTool.name,
    extractStyleTool.description,
    ExtractStyleInputSchema.shape,
    async (params) => extractStyleTool.execute(params),
  );
}
