import { AddElementInputSchema } from "../types/diagram.js";
import { loadPreset } from "../styles/loader.js";
import { buildAddElementScript } from "../bridge/add-element.js";
import { runOmniJSFile } from "../bridge/execute.js";

export const addElementTool = {
  name: "add_element" as const,
  description:
    "Add a single shape, line, or text annotation to the frontmost OmniGraffle canvas. " +
    "For incremental diagram building and refinement.",
  inputSchema: AddElementInputSchema,

  async execute(input: unknown) {
    const parsed = AddElementInputSchema.parse(input);
    const preset = loadPreset(parsed.style_preset);

    const script = buildAddElementScript({
      type: parsed.type,
      label: parsed.label,
      role: parsed.role,
      x: parsed.x,
      y: parsed.y,
      width: parsed.width,
      height: parsed.height,
      connectFromName: parsed.connect_from_name,
      connectToName: parsed.connect_to_name,
      preset,
    });

    const result = runOmniJSFile(script);

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to add element: ${result.error}`,
        }],
        isError: true,
      };
    }

    const desc = parsed.type === "line"
      ? `line from "${parsed.connect_from_name}" to "${parsed.connect_to_name}"`
      : parsed.type === "text_annotation"
        ? `text annotation "${parsed.label}"`
        : `${parsed.role} shape "${parsed.label}"`;

    return {
      content: [{
        type: "text" as const,
        text: `Added ${desc} at (${parsed.x}, ${parsed.y})`,
      }],
    };
  },
};
