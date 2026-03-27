import type { DiagramNode, DiagramConnection } from "../types/diagram.js";

export const pipelineDAGTemplate = {
  name: "pipeline-dag",
  description:
    "Data pipeline DAG: sources → ingestion → transforms (with branching) → sinks. " +
    "Adapt for ETL, streaming, or batch pipelines. " +
    "Use auto_hierarchical layout for left-to-right or top-to-bottom flow.",
  nodes: [
    { id: "source_a", label: "Source A", role: "input", shape: "rounded_rectangle" },
    { id: "source_b", label: "Source B", role: "input", shape: "rounded_rectangle" },
    { id: "ingestion", label: "Ingestion", role: "encoder", shape: "rounded_rectangle" },
    { id: "validation", label: "Validation", role: "attention", shape: "rounded_rectangle" },
    { id: "transform_1", label: "Transform 1", role: "intermediate", shape: "rounded_rectangle" },
    { id: "transform_2", label: "Transform 2", role: "intermediate", shape: "rounded_rectangle" },
    { id: "aggregation", label: "Aggregation", role: "decoder", shape: "rounded_rectangle" },
    { id: "sink_db", label: "Database", role: "output", shape: "rounded_rectangle" },
    { id: "sink_warehouse", label: "Data Warehouse", role: "output", shape: "rounded_rectangle" },
  ] as DiagramNode[],
  connections: [
    { from: "source_a", to: "ingestion", style: "default" },
    { from: "source_b", to: "ingestion", style: "default" },
    { from: "ingestion", to: "validation", style: "highlight" },
    { from: "validation", to: "transform_1", style: "default" },
    { from: "validation", to: "transform_2", style: "default" },
    { from: "transform_1", to: "aggregation", style: "default" },
    { from: "transform_2", to: "aggregation", style: "default" },
    { from: "aggregation", to: "sink_db", style: "default" },
    { from: "aggregation", to: "sink_warehouse", style: "default" },
  ] as DiagramConnection[],
};
