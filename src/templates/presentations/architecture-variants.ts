import type { PresentationSpec } from "../../types/presentation.js";

export const architectureVariantsTemplate: PresentationSpec = {
  title: "System Architecture — Design Variants",
  description:
    "Start with a baseline architecture and show how design variants " +
    "(message queue, cache layer) change the system topology.",
  base_diagram: {
    nodes: [
      { id: "client", label: "Client", role: "input", shape: "rounded_rectangle", x: 360, y: 40 },
      { id: "api", label: "API Server", role: "encoder", shape: "rounded_rectangle", x: 360, y: 180 },
      { id: "service_a", label: "Service A", role: "attention", shape: "rounded_rectangle", x: 180, y: 320 },
      { id: "service_b", label: "Service B", role: "decoder", shape: "rounded_rectangle", x: 540, y: 320 },
      { id: "database", label: "Database", role: "output", shape: "rectangle", x: 360, y: 460 },
    ],
    connections: [
      { from: "client", to: "api", style: "default" },
      { from: "api", to: "service_a", style: "default" },
      { from: "api", to: "service_b", style: "default" },
      { from: "service_a", to: "database", style: "default" },
      { from: "service_b", to: "database", style: "default" },
    ],
    layout: "manual",
    style_preset: "illustrated-technical",
  },
  slides: [
    {
      title: "Monolithic Baseline",
      annotations: [
        { text: "Direct synchronous calls", x: 360, y: 550, style: "label" },
      ],
    },
    {
      title: "With Message Queue",
      add_nodes: [
        { id: "queue", label: "Message Queue", role: "intermediate", shape: "rounded_rectangle", x: 360, y: 320 },
      ],
      add_connections: [
        { from: "api", to: "queue", style: "highlight" },
        { from: "queue", to: "service_a", style: "dashed" },
        { from: "queue", to: "service_b", style: "dashed" },
      ],
      remove_connections: ["api->service_a", "api->service_b"],
      annotations: [
        {
          text: "Async decoupling via\nmessage broker",
          anchor_node: "queue",
          style: "callout",
        },
      ],
    },
    {
      title: "With Cache Layer",
      add_nodes: [
        { id: "cache", label: "Cache", role: "embedding", shape: "rounded_rectangle", x: 600, y: 180 },
      ],
      add_connections: [
        { from: "api", to: "cache", style: "highlight" },
        { from: "cache", to: "database", label: "miss", style: "dashed" },
      ],
      annotations: [
        {
          text: "Read-through cache\nreduces DB load",
          anchor_node: "cache",
          style: "callout",
        },
      ],
    },
  ],
};
