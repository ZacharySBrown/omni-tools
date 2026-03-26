import { ExportDiagramInputSchema } from "../types/diagram.js";
import { buildExportScript } from "../bridge/export.js";
import { runOmniJSFile } from "../bridge/execute.js";

export const exportDiagramTool = {
  name: "export_diagram" as const,
  description:
    "Export an OmniGraffle document (or the frontmost open document) to PDF, SVG, PNG, or TIFF.",
  inputSchema: ExportDiagramInputSchema,

  async execute(input: unknown) {
    const parsed = ExportDiagramInputSchema.parse(input);

    const script = buildExportScript({
      documentPath: parsed.document_path,
      outputPath: parsed.output_path,
      format: parsed.format,
      canvasName: parsed.canvas_name,
      dpi: parsed.dpi,
    });

    const result = runOmniJSFile(script);

    if (!result.success) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `Export error: ${result.error}\n\n` +
              "Troubleshooting:\n" +
              "- Is an OmniGraffle document open?\n" +
              "- Is the output path writable?\n" +
              "- Check System Settings → Privacy & Security → Automation",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Exported to ${parsed.output_path} (${parsed.format.toUpperCase()})`,
        },
      ],
    };
  },
};
