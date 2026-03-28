import type { PresentationSpec } from "../../types/presentation.js";

export const trainingVsInferenceTemplate: PresentationSpec = {
  title: "ML Model — Training vs Inference",
  description:
    "Dual-path diagram showing an ML model's training loop and " +
    "inference path. Each slide isolates one path for clarity.",
  base_diagram: {
    nodes: [
      { id: "training_data", label: "Training Data", role: "input", shape: "rounded_rectangle", x: 80, y: 120 },
      { id: "model", label: "Model", role: "encoder", shape: "rounded_rectangle", x: 360, y: 200 },
      { id: "loss", label: "Loss Function", role: "attention", shape: "rounded_rectangle", x: 620, y: 120 },
      { id: "optimizer", label: "Optimizer", role: "decoder", shape: "rounded_rectangle", x: 360, y: 40 },
      { id: "inference_input", label: "New Input", role: "input", shape: "rounded_rectangle", x: 80, y: 340 },
      { id: "prediction", label: "Prediction", role: "output", shape: "rounded_rectangle", x: 620, y: 340 },
    ],
    connections: [
      { from: "training_data", to: "model", style: "default" },
      { from: "model", to: "loss", style: "default" },
      { from: "loss", to: "optimizer", style: "default" },
      { from: "optimizer", to: "model", label: "update weights", style: "dashed" },
      { from: "inference_input", to: "model", style: "highlight" },
      { from: "model", to: "prediction", style: "highlight" },
    ],
    layout: "manual",
    style_preset: "illustrated-technical",
  },
  slides: [
    {
      title: "Full View",
      annotations: [
        { text: "Training loop (top) and inference path (bottom)", x: 300, y: 420, style: "label" },
      ],
    },
    {
      title: "Training Path",
      highlight_nodes: ["training_data", "model", "loss", "optimizer"],
      dim_nodes: ["inference_input", "prediction"],
      highlight_connections: [
        "training_data->model",
        "model->loss",
        "loss->optimizer",
        "optimizer->model",
      ],
      annotations: [
        {
          text: "Iterative weight updates\nvia backpropagation",
          anchor_node: "optimizer",
          style: "callout",
        },
      ],
    },
    {
      title: "Inference Path",
      highlight_nodes: ["inference_input", "model", "prediction"],
      dim_nodes: ["training_data", "loss", "optimizer"],
      highlight_connections: [
        "inference_input->model",
        "model->prediction",
      ],
      annotations: [
        {
          text: "Forward pass only —\nfrozen weights, no gradient",
          anchor_node: "prediction",
          style: "callout",
        },
      ],
    },
  ],
};
