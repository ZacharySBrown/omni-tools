import { z } from "zod";
import { extractDiagramSpec } from "../bridge/extract-spec.js";

export const ExtractDiagramSpecInputSchema = z.object({
  include_style_overrides: z.boolean().optional().describe(
    "Include style_overrides in the output spec (colors, typography). Default false — uses preset defaults.",
  ),
});

export const extractDiagramSpecTool = {
  name: "extract_diagram_spec",
  description:
    "Extract a create_diagram-compatible JSON spec from the frontmost OmniGraffle document. " +
    "Enables round-trip editing: generate a diagram, edit manually, then extract the updated spec for regeneration.",

  async execute(params: Record<string, unknown>): Promise<{
    content: Array<{ type: "text"; text: string }>;
  }> {
    const spec = extractDiagramSpec();
    const output = JSON.stringify(spec, null, 2);
    return {
      content: [{ type: "text", text: output }],
    };
  },
};
