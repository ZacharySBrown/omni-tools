import type { DiagramNode, DiagramConnection } from "../types/diagram.js";

export const agentHarnessTemplate = {
  name: "agent-harness",
  description:
    "Agentic system architecture: orchestrator → specialized agents → tools/APIs → memory/state → output. " +
    "Adapt for single-agent or multi-agent patterns. " +
    "Use auto_hierarchical layout. Works well with illustrated-technical preset.",
  nodes: [
    { id: "user_input", label: "User Input", role: "input", shape: "rounded_rectangle" },
    { id: "orchestrator", label: "Orchestrator", role: "encoder", shape: "rounded_rectangle" },
    { id: "planner", label: "Planner Agent", role: "attention", shape: "rounded_rectangle" },
    { id: "executor", label: "Executor Agent", role: "decoder", shape: "rounded_rectangle" },
    { id: "tools", label: "Tools / APIs", role: "intermediate", shape: "rounded_rectangle" },
    { id: "memory", label: "Memory / State", role: "embedding", shape: "rounded_rectangle" },
    { id: "reviewer", label: "Reviewer Agent", role: "attention", shape: "rounded_rectangle" },
    { id: "output", label: "Final Output", role: "output", shape: "rounded_rectangle" },
  ] as DiagramNode[],
  connections: [
    { from: "user_input", to: "orchestrator", style: "default" },
    { from: "orchestrator", to: "planner", style: "highlight" },
    { from: "planner", to: "executor", style: "default" },
    { from: "executor", to: "tools", style: "default" },
    { from: "tools", to: "memory", style: "dashed" },
    { from: "memory", to: "orchestrator", label: "context", style: "dashed" },
    { from: "executor", to: "reviewer", style: "default" },
    { from: "reviewer", to: "orchestrator", label: "feedback", style: "dashed" },
    { from: "reviewer", to: "output", style: "highlight" },
  ] as DiagramConnection[],
};
