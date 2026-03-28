import type { DiagramNode, DiagramConnection, LayoutType } from "../types/diagram.js";
import type { StyleTokens } from "../types/styles.js";
import type { PresentationSpec, SlideOverride, Annotation } from "../types/presentation.js";
import { loadPreset } from "../styles/loader.js";

export type NodeState = "normal" | "highlighted" | "dimmed" | "hidden";

export interface ResolvedAnnotation {
  text: string;
  x: number;
  y: number;
  style: "callout" | "label" | "note";
}

export interface ResolvedNode extends DiagramNode {
  state: NodeState;
}

export interface ResolvedConnection extends DiagramConnection {
  state: NodeState;
}

export interface ResolvedSlide {
  title: string;
  canvas_name: string;
  nodes: ResolvedNode[];
  connections: ResolvedConnection[];
  annotations: ResolvedAnnotation[];
  layout: LayoutType;
  preset: StyleTokens;
}

function connKey(from: string, to: string): string {
  return `${from}->${to}`;
}

function resolveAnnotations(
  annotations: Annotation[] | undefined,
  nodeMap: Map<string, DiagramNode>,
  preset: StyleTokens,
): ResolvedAnnotation[] {
  if (!annotations || annotations.length === 0) return [];
  return annotations.map((ann) => {
    let x = ann.x ?? 0;
    let y = ann.y ?? 0;
    if (ann.anchor_node) {
      const node = nodeMap.get(ann.anchor_node);
      if (node) {
        const nodeW = node.width ?? preset.shapes.min_node_width;
        x = (node.x ?? 0) + nodeW + 20;
        y = (node.y ?? 0) - 10;
      }
    }
    return { text: ann.text, x, y, style: ann.style };
  });
}

function resolveNodeState(nodeId: string, slide: SlideOverride): NodeState {
  if (slide.visible_nodes) {
    if (!slide.visible_nodes.includes(nodeId)) return "hidden";
  }
  if (slide.hidden_nodes) {
    if (slide.hidden_nodes.includes(nodeId)) return "hidden";
  }
  if (slide.highlight_nodes?.includes(nodeId)) return "highlighted";
  if (slide.dim_nodes?.includes(nodeId)) return "dimmed";
  return "normal";
}

function resolveConnectionState(
  conn: DiagramConnection,
  slide: SlideOverride,
  nodeStates: Map<string, NodeState>,
): NodeState {
  const fromState = nodeStates.get(conn.from);
  const toState = nodeStates.get(conn.to);
  if (fromState === "hidden" || toState === "hidden") return "hidden";
  const key = connKey(conn.from, conn.to);
  if (slide.highlight_connections?.includes(key)) return "highlighted";
  if (slide.dim_connections?.includes(key)) return "dimmed";
  if (fromState === "dimmed" && toState === "dimmed") return "dimmed";
  return "normal";
}

export function resolvePresentation(spec: PresentationSpec): ResolvedSlide[] {
  const preset = loadPreset(spec.base_diagram.style_preset);
  const baseNodes = spec.base_diagram.nodes;
  const baseConnections = spec.base_diagram.connections;
  return spec.slides.map((slide, i) => {
    const allNodes: DiagramNode[] = [...baseNodes, ...(slide.add_nodes ?? [])];
    const allConnections: DiagramConnection[] = [
      ...baseConnections,
      ...(slide.add_connections ?? []),
    ];
    const removeSet = new Set(slide.remove_connections ?? []);
    const filteredConnections = allConnections.filter(
      (c) => !removeSet.has(connKey(c.from, c.to)),
    );
    const nodeStates = new Map<string, NodeState>();
    for (const node of allNodes) {
      nodeStates.set(node.id, resolveNodeState(node.id, slide));
    }
    const resolvedConnections: ResolvedConnection[] = filteredConnections.map(
      (c) => ({
        ...c,
        state: resolveConnectionState(c, slide, nodeStates),
      }),
    );
    const resolvedNodes: ResolvedNode[] = allNodes.map((n) => ({
      ...n,
      state: nodeStates.get(n.id) ?? "normal",
    }));
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    const annotations = resolveAnnotations(slide.annotations, nodeMap, preset);
    const title = slide.title ?? `${spec.title} — Slide ${i + 1}`;
    return {
      title,
      canvas_name: `Slide ${i + 1}`,
      nodes: resolvedNodes,
      connections: resolvedConnections,
      annotations,
      layout: spec.base_diagram.layout,
      preset,
    };
  });
}
