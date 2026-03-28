import { PresentationSpecInputSchema } from "../types/presentation.js";
import { resolvePresentation } from "../presentation/resolver.js";
import { buildDeckScript } from "../bridge/presentation.js";
import { runOmniJSFile } from "../bridge/execute.js";

export const CreateSlideDeckInputSchema = PresentationSpecInputSchema;

export const createSlideDeckTool = {
  name: "create_slide_deck" as const,
  description:
    "Render all slides in a presentation as layers in a single OmniGraffle document. " +
    "Each slide gets its own layer with highlight/dim/hidden states applied. " +
    "If output_path is a directory and output_format is set, exports each layer as a numbered asset.",
  inputSchema: CreateSlideDeckInputSchema,

  async execute(input: unknown) {
    const parsed = CreateSlideDeckInputSchema.parse(input);
    const resolved = resolvePresentation(parsed);

    const script = buildDeckScript({
      title: parsed.title,
      slides: resolved,
      savePath: parsed.save_path,
      exportDir: parsed.output_path,
      exportFormat: parsed.output_format,
    });

    const result = runOmniJSFile(script, 120000);

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `OmniGraffle error: ${result.error}\n\nTroubleshooting:\n- Is OmniGraffle installed and licensed?\n- Check System Settings → Privacy & Security → Automation`,
        }],
        isError: true,
      };
    }

    const exportNote = parsed.output_path
      ? `\nExported to ${parsed.output_path}/slide-01.${parsed.output_format ?? "png"} ... slide-${String(resolved.length).padStart(2, "0")}.${parsed.output_format ?? "png"}`
      : "";

    return {
      content: [{
        type: "text" as const,
        text: `Deck "${parsed.title}" rendered with ${resolved.length} layers in one OmniGraffle document.${exportNote}`,
      }],
    };
  },
};
