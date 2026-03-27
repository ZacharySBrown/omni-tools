import { ApplyStylePresetInputSchema } from "../types/diagram.js";
import { loadPreset } from "../styles/loader.js";
import { buildApplyStyleScript } from "../bridge/apply-style.js";
import { runOmniJSFile } from "../bridge/execute.js";

export const applyStylePresetTool = {
  name: "apply_style_preset" as const,
  description:
    "Apply a named style preset to all shapes in an OmniGraffle document. " +
    "Re-colors shapes by semantic role and updates typography. Non-destructive on geometry.",
  inputSchema: ApplyStylePresetInputSchema,

  async execute(input: unknown) {
    const parsed = ApplyStylePresetInputSchema.parse(input);
    const preset = loadPreset(parsed.preset_name);

    const script = buildApplyStyleScript({
      preset,
      documentPath: parsed.document_path,
      scope: parsed.scope,
      remapByRole: parsed.remap_by_role,
    });

    const result = runOmniJSFile(script);

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to apply style preset: ${result.error}`,
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: `Applied "${parsed.preset_name}" preset to ${parsed.scope === "all_canvases" ? "all canvases" : "current canvas"}. ${result.output}`,
      }],
    };
  },
};
