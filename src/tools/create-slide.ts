import { PresentationSpecInputSchema } from "../types/presentation.js";
import { resolvePresentation } from "../presentation/resolver.js";
import { buildSlideScript } from "../bridge/presentation.js";
import { buildExportScript } from "../bridge/export.js";
import { runOmniJSFile } from "../bridge/execute.js";
import { z } from "zod";

export const CreateSlideInputSchema = PresentationSpecInputSchema.extend({
  slide_index: z.number().int().min(0).describe(
    "Zero-based index of the slide to render. Defaults to 0 (first slide).",
  ).default(0),
});

export const createSlideTool = {
  name: "create_slide" as const,
  description:
    "Render a single presentation slide graphic in OmniGraffle. " +
    "Takes a presentation spec with base diagram and slide overrides, " +
    "renders the specified slide with highlight/dim/hidden states applied. " +
    "Exports to PNG/PDF if output_path is specified.",
  inputSchema: CreateSlideInputSchema,

  async execute(input: unknown) {
    const parsed = CreateSlideInputSchema.parse(input);

    if (parsed.slide_index >= parsed.slides.length) {
      return {
        content: [{
          type: "text" as const,
          text: `Invalid slide_index ${parsed.slide_index}: presentation has ${parsed.slides.length} slides (0-${parsed.slides.length - 1})`,
        }],
        isError: true,
      };
    }

    const resolved = resolvePresentation(parsed);
    const slide = resolved[parsed.slide_index];

    const script = buildSlideScript({ slide, savePath: parsed.save_path });
    const result = runOmniJSFile(script);

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `OmniGraffle error: ${result.error}\n\nTroubleshooting:\n- Is OmniGraffle installed and licensed?\n- Check System Settings → Privacy & Security → Automation`,
        }],
        isError: true,
      };
    }

    if (parsed.output_path && parsed.output_format) {
      const exportScript = buildExportScript({
        outputPath: parsed.output_path,
        format: parsed.output_format,
        dpi: 144,
      });
      const exportResult = runOmniJSFile(exportScript);
      if (!exportResult.success) {
        return {
          content: [{
            type: "text" as const,
            text: `Slide rendered but export failed: ${exportResult.error}`,
          }],
        };
      }
      return {
        content: [{
          type: "text" as const,
          text: `Slide "${slide.title}" rendered and exported to ${parsed.output_path}`,
        }],
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: `Slide "${slide.title}" rendered in OmniGraffle (${slide.nodes.filter(n => n.state !== "hidden").length} visible nodes, ${slide.annotations.length} annotations)`,
      }],
    };
  },
};
