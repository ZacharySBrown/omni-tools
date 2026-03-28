import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CreateDiagramInputSchema,
  ExportDiagramInputSchema,
  ListStylePresetsInputSchema,
  ApplyStylePresetInputSchema,
  AddElementInputSchema,
  ExtractStyleInputSchema,
} from "../types/diagram.js";
import { ReviewDiagramInputSchema } from "../types/review.js";
import { createDiagramTool } from "./create-diagram.js";
import { exportDiagramTool } from "./export-diagram.js";
import { listStylePresetsTool } from "./list-style-presets.js";
import { applyStylePresetTool } from "./apply-style-preset.js";
import { addElementTool } from "./add-element.js";
import { extractStyleTool } from "./extract-style.js";
import { reviewDiagramTool } from "./review-diagram.js";
import { createSlideTool, CreateSlideInputSchema } from "./create-slide.js";
import { createSlideDeckTool, CreateSlideDeckInputSchema } from "./create-slide-deck.js";
import { extractDiagramSpecTool, ExtractDiagramSpecInputSchema } from "./extract-diagram-spec.js";

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

  server.tool(
    reviewDiagramTool.name,
    reviewDiagramTool.description,
    ReviewDiagramInputSchema.shape,
    async (params) => reviewDiagramTool.execute(params as unknown as Record<string, unknown>),
  );

  server.tool(
    createSlideTool.name,
    createSlideTool.description,
    CreateSlideInputSchema.shape,
    async (params) => createSlideTool.execute(params),
  );

  server.tool(
    createSlideDeckTool.name,
    createSlideDeckTool.description,
    CreateSlideDeckInputSchema.shape,
    async (params) => createSlideDeckTool.execute(params),
  );

  server.tool(
    extractDiagramSpecTool.name,
    extractDiagramSpecTool.description,
    ExtractDiagramSpecInputSchema.shape,
    async (params) => extractDiagramSpecTool.execute(params as unknown as Record<string, unknown>),
  );
}
