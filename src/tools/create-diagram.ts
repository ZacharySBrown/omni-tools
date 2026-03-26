import { CreateDiagramInputSchema } from "../types/diagram.js";
import { loadPreset } from "../styles/loader.js";
import { buildDiagramScript } from "../bridge/diagram.js";
import { buildExportScript } from "../bridge/export.js";
import { runOmniJSFile } from "../bridge/execute.js";

export const createDiagramTool = {
  name: "create_diagram" as const,
  description:
    "Create a new OmniGraffle diagram from a structured specification of nodes and connections. " +
    "Supports architecture diagrams, data flow diagrams, and component diagrams with semantic color-coding.",
  inputSchema: CreateDiagramInputSchema,

  async execute(input: unknown) {
    const parsed = CreateDiagramInputSchema.parse(input);
    const preset = loadPreset(parsed.style_preset);

    const script = buildDiagramScript({
      title: parsed.title,
      nodes: parsed.nodes,
      connections: parsed.connections,
      layout: parsed.layout,
      canvasType: parsed.canvas_type,
      preset,
    });

    const result = runOmniJSFile(script);

    if (!result.success) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `OmniGraffle error: ${result.error}\n\n` +
              "Troubleshooting:\n" +
              "- Is OmniGraffle installed and licensed?\n" +
              "- Check System Settings → Privacy & Security → Automation → allow Terminal to control OmniGraffle",
          },
        ],
        isError: true,
      };
    }

    // Auto-export if output_path specified
    if (parsed.output_path && parsed.output_format) {
      const exportScript = buildExportScript({
        outputPath: parsed.output_path,
        format: parsed.output_format,
        dpi: 144,
      });
      const exportResult = runOmniJSFile(exportScript);
      if (!exportResult.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Diagram created but export failed: ${exportResult.error}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Diagram "${parsed.title}" created and exported to ${parsed.output_path}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Diagram "${parsed.title}" created in OmniGraffle with ${parsed.nodes.length} nodes and ${parsed.connections.length} connections.`,
        },
      ],
    };
  },
};
