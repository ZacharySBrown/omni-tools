import type { DiagramNode, DiagramConnection } from "../types/diagram.js";

export const experimentLoopTemplate = {
  name: "experiment-loop",
  description:
    "ML/AI experiment lifecycle: data loading → preprocessing → model → training loop → evaluation → logging. " +
    "Adapt node labels to your specific framework (PyTorch, TensorFlow, JAX). " +
    "Use auto_hierarchical layout for top-to-bottom flow.",
  nodes: [
    { id: "data_source", label: "Data Source", role: "input", shape: "rounded_rectangle" },
    { id: "preprocessing", label: "Preprocessing", role: "intermediate", shape: "rounded_rectangle" },
    { id: "dataloader", label: "DataLoader", role: "intermediate", shape: "rounded_rectangle" },
    { id: "model", label: "Model", role: "encoder", shape: "rounded_rectangle" },
    { id: "loss", label: "Loss Function", role: "attention", shape: "rounded_rectangle" },
    { id: "optimizer", label: "Optimizer", role: "decoder", shape: "rounded_rectangle" },
    { id: "evaluation", label: "Evaluation", role: "output", shape: "rounded_rectangle" },
    { id: "logging", label: "Logging / W&B", role: "neutral", shape: "rounded_rectangle" },
  ] as DiagramNode[],
  connections: [
    { from: "data_source", to: "preprocessing", style: "default" },
    { from: "preprocessing", to: "dataloader", style: "default" },
    { from: "dataloader", to: "model", style: "highlight" },
    { from: "model", to: "loss", style: "default" },
    { from: "loss", to: "optimizer", style: "default" },
    { from: "optimizer", to: "model", label: "backprop", style: "dashed" },
    { from: "model", to: "evaluation", style: "default" },
    { from: "evaluation", to: "logging", style: "default" },
  ] as DiagramConnection[],
};
