import type { PresentationSpec } from "../../types/presentation.js";

export const annotatedDataFlowTemplate: PresentationSpec = {
  title: "Request Pipeline — Annotated Walkthrough",
  description:
    "Annotated walkthrough: the full pipeline is always visible. " +
    "Each slide highlights a different stage with explanatory callouts.",
  base_diagram: {
    nodes: [
      { id: "request", label: "HTTP Request", role: "input", shape: "rounded_rectangle", x: 80, y: 200 },
      { id: "validate", label: "Validation", role: "attention", shape: "rounded_rectangle", x: 280, y: 200 },
      { id: "transform", label: "Transform", role: "intermediate", shape: "rounded_rectangle", x: 480, y: 200 },
      { id: "process", label: "Business Logic", role: "encoder", shape: "rounded_rectangle", x: 680, y: 200 },
      { id: "persist", label: "Persist", role: "decoder", shape: "rounded_rectangle", x: 880, y: 200 },
      { id: "response", label: "HTTP Response", role: "output", shape: "rounded_rectangle", x: 1080, y: 200 },
    ],
    connections: [
      { from: "request", to: "validate", style: "default" },
      { from: "validate", to: "transform", style: "default" },
      { from: "transform", to: "process", style: "default" },
      { from: "process", to: "persist", style: "default" },
      { from: "persist", to: "response", style: "default" },
    ],
    layout: "manual",
    style_preset: "illustrated-technical",
  },
  slides: [
    {
      title: "Overview",
      annotations: [
        { text: "6-stage request pipeline", x: 400, y: 80, style: "label" },
      ],
    },
    {
      title: "Input Validation",
      highlight_nodes: ["request", "validate"],
      dim_nodes: ["transform", "process", "persist", "response"],
      annotations: [
        {
          text: "Schema validation, auth check,\nrate limiting",
          anchor_node: "validate",
          style: "callout",
        },
      ],
    },
    {
      title: "Data Transformation",
      highlight_nodes: ["transform"],
      dim_nodes: ["request", "validate", "process", "persist", "response"],
      annotations: [
        {
          text: "Normalize inputs, apply defaults,\nenrich with context",
          anchor_node: "transform",
          style: "callout",
        },
      ],
    },
    {
      title: "Business Logic",
      highlight_nodes: ["process"],
      dim_nodes: ["request", "validate", "transform", "persist", "response"],
      annotations: [
        {
          text: "Core domain operations,\nside effects, event emission",
          anchor_node: "process",
          style: "callout",
        },
      ],
    },
    {
      title: "Persistence & Response",
      highlight_nodes: ["persist", "response"],
      dim_nodes: ["request", "validate", "transform", "process"],
      highlight_connections: ["persist->response"],
      annotations: [
        {
          text: "Commit to database,\nformat response payload",
          anchor_node: "persist",
          style: "callout",
        },
      ],
    },
  ],
};
