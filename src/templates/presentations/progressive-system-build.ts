import type { PresentationSpec } from "../../types/presentation.js";

export const progressiveSystemBuildTemplate: PresentationSpec = {
  title: "System Architecture — Progressive Build",
  description:
    "Progressive reveal: start with the entry point, add components " +
    "layer by layer until the full architecture is visible.",
  base_diagram: {
    nodes: [
      { id: "client", label: "Client", role: "input", shape: "rounded_rectangle", x: 400, y: 40 },
      { id: "gateway", label: "API Gateway", role: "encoder", shape: "rounded_rectangle", x: 370, y: 160 },
      { id: "auth", label: "Auth Service", role: "attention", shape: "rounded_rectangle", x: 160, y: 300 },
      { id: "core", label: "Core Service", role: "encoder", shape: "rounded_rectangle", x: 400, y: 300 },
      { id: "data", label: "Data Service", role: "decoder", shape: "rounded_rectangle", x: 640, y: 300 },
      { id: "db", label: "Database", role: "output", shape: "rectangle", x: 400, y: 440 },
      { id: "cache", label: "Cache", role: "embedding", shape: "rounded_rectangle", x: 640, y: 440 },
      { id: "queue", label: "Message Queue", role: "intermediate", shape: "rounded_rectangle", x: 160, y: 440 },
    ],
    connections: [
      { from: "client", to: "gateway", style: "default" },
      { from: "gateway", to: "auth", style: "default" },
      { from: "gateway", to: "core", style: "highlight" },
      { from: "gateway", to: "data", style: "default" },
      { from: "core", to: "db", style: "default" },
      { from: "data", to: "cache", style: "default" },
      { from: "core", to: "queue", style: "dashed" },
      { from: "queue", to: "auth", style: "dashed" },
    ],
    layout: "manual",
    style_preset: "illustrated-technical",
  },
  slides: [
    {
      title: "Entry Point",
      visible_nodes: ["client", "gateway"],
    },
    {
      title: "Core Services",
      visible_nodes: ["client", "gateway", "auth", "core", "data"],
    },
    {
      title: "Persistence Layer",
      visible_nodes: ["client", "gateway", "auth", "core", "data", "db", "cache"],
    },
    {
      title: "Full Architecture",
      annotations: [
        { text: "Async event bus", anchor_node: "queue", style: "callout" },
      ],
    },
  ],
};
