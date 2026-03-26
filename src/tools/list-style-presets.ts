import { ListStylePresetsInputSchema } from "../types/diagram.js";
import { listPresets } from "../styles/loader.js";

export const listStylePresetsTool = {
  name: "list_style_presets" as const,
  description: "List all available style presets with their names, descriptions, and versions.",
  inputSchema: ListStylePresetsInputSchema,

  async execute(input: unknown) {
    ListStylePresetsInputSchema.parse(input);

    const presets = listPresets();

    if (presets.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No style presets found. Check DIAGRAMMER_PRESETS_DIR environment variable.",
          },
        ],
      };
    }

    const lines = presets.map(
      (p) => `- **${p.name}** (v${p.version}): ${p.description}`,
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Available style presets:\n\n${lines.join("\n")}`,
        },
      ],
    };
  },
};
