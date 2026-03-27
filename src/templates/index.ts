import { experimentLoopTemplate } from "./experiment-loop.js";
import { agentHarnessTemplate } from "./agent-harness.js";
import { pipelineDAGTemplate } from "./pipeline-dag.js";
import { configTreeTemplate } from "./config-tree.js";

export const diagramTemplates = [
  experimentLoopTemplate,
  agentHarnessTemplate,
  pipelineDAGTemplate,
  configTreeTemplate,
];

export function getTemplate(name: string) {
  return diagramTemplates.find((t) => t.name === name);
}

export function listTemplates() {
  return diagramTemplates.map((t) => ({
    name: t.name,
    description: t.description,
  }));
}
