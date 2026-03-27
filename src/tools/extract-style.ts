import * as fs from "fs";
import * as path from "path";
import { ExtractStyleInputSchema } from "../types/diagram.js";
import { buildExtractStyleScript } from "../bridge/extract-style.js";
import { buildPresetFromSamples, type ShapeSample } from "../styles/extractor.js";
import { runOmniJSFile } from "../bridge/execute.js";

export const extractStyleTool = {
  name: "extract_style_from_document" as const,
  description:
    "Analyze an OmniGraffle document and extract its visual style as a new style preset JSON file. " +
    "Useful for bootstrapping a preset from existing slides or diagrams.",
  inputSchema: ExtractStyleInputSchema,

  async execute(input: unknown) {
    const parsed = ExtractStyleInputSchema.parse(input);

    const script = buildExtractStyleScript({
      documentPath: parsed.document_path,
    });

    const result = runOmniJSFile(script);

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to extract style: ${result.error}`,
        }],
        isError: true,
      };
    }

    let samples: ShapeSample[];
    try {
      samples = JSON.parse(result.output ?? "[]");
    } catch {
      return {
        content: [{
          type: "text" as const,
          text: "Failed to parse shape samples from OmniGraffle",
        }],
        isError: true,
      };
    }

    if (samples.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "No shapes found in the document to extract style from",
        }],
        isError: true,
      };
    }

    const preset = buildPresetFromSamples(samples, parsed.output_preset_name);

    const presetsDir = parsed.output_preset_path
      ?? process.env.DIAGRAMMER_PRESETS_DIR
      ?? path.join(process.cwd(), "presets");

    const outputPath = path.join(presetsDir, `${parsed.output_preset_name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(preset, null, 2), "utf8");

    return {
      content: [{
        type: "text" as const,
        text: `Extracted style from ${samples.length} shapes → saved as "${parsed.output_preset_name}" at ${outputPath}`,
      }],
    };
  },
};
