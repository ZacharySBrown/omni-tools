import { annotatedDataFlowTemplate } from "./annotated-data-flow.js";
import { progressiveSystemBuildTemplate } from "./progressive-system-build.js";
import { trainingVsInferenceTemplate } from "./training-vs-inference.js";
import { architectureVariantsTemplate } from "./architecture-variants.js";

export const PRESENTATION_TEMPLATES = {
  "annotated-data-flow": annotatedDataFlowTemplate,
  "progressive-system-build": progressiveSystemBuildTemplate,
  "training-vs-inference": trainingVsInferenceTemplate,
  "architecture-variants": architectureVariantsTemplate,
} as const;

export type PresentationTemplateName = keyof typeof PRESENTATION_TEMPLATES;

export function getPresentationTemplate(name: string) {
  return PRESENTATION_TEMPLATES[name as PresentationTemplateName];
}

export function listPresentationTemplates(): string[] {
  return Object.keys(PRESENTATION_TEMPLATES);
}
