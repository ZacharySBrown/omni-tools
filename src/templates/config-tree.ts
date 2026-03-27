import type { DiagramNode, DiagramConnection } from "../types/diagram.js";

export const configTreeTemplate = {
  name: "config-tree",
  description:
    "Hierarchical configuration with overrides: base config → environment configs → runtime overrides. " +
    "Adapt for Hydra, OmegaConf, or any layered config system. " +
    "Use auto_hierarchical layout.",
  nodes: [
    { id: "base", label: "Base Config", role: "encoder", shape: "rounded_rectangle" },
    { id: "model", label: "Model Config", role: "intermediate", shape: "rounded_rectangle" },
    { id: "data", label: "Data Config", role: "intermediate", shape: "rounded_rectangle" },
    { id: "training", label: "Training Config", role: "intermediate", shape: "rounded_rectangle" },
    { id: "env_dev", label: "Dev Overrides", role: "attention", shape: "rounded_rectangle" },
    { id: "env_prod", label: "Prod Overrides", role: "attention", shape: "rounded_rectangle" },
    { id: "runtime", label: "CLI Overrides", role: "decoder", shape: "rounded_rectangle" },
    { id: "final", label: "Resolved Config", role: "output", shape: "rounded_rectangle" },
  ] as DiagramNode[],
  connections: [
    { from: "base", to: "model", style: "default" },
    { from: "base", to: "data", style: "default" },
    { from: "base", to: "training", style: "default" },
    { from: "model", to: "env_dev", style: "dashed" },
    { from: "model", to: "env_prod", style: "dashed" },
    { from: "data", to: "env_dev", style: "dashed" },
    { from: "data", to: "env_prod", style: "dashed" },
    { from: "env_dev", to: "runtime", style: "default" },
    { from: "env_prod", to: "runtime", style: "default" },
    { from: "runtime", to: "final", style: "highlight" },
  ] as DiagramConnection[],
};
