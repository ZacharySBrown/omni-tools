import { readDiagramState, type ReadbackShape, type ReadbackLine } from "./review.js";

/** Color-to-role reverse mapping for illustrated-technical preset */
const COLOR_TO_ROLE: Record<string, string> = {
  "#C4DAFC": "encoder",
  "#F4C2CB": "decoder",
  "#FDECC8": "attention",
  "#B8E6D0": "embedding",
  "#E8F0FE": "input",
  "#FDE8EF": "intermediate",
};

/** Line type string from OmniGraffle to connection spec */
const LINE_TYPE_MAP: Record<string, string> = {
  "0": "straight",
  "1": "orthogonal",
  "2": "curved",
};

interface ExtractedNode {
  id: string;
  label: string;
  sublabel?: string;
  role: string;
  shape: string;
  width: number;
  height: number;
  x: number;
  y: number;
  font_size: number;
  opacity?: number;
  text_color?: string;
}

interface ExtractedConnection {
  from: string;
  to: string;
  label?: string;
  line_type: string;
}

export interface ExtractedSpec {
  title: string;
  layout: string;
  nodes: ExtractedNode[];
  connections: ExtractedConnection[];
}

function inferRole(shape: ReadbackShape): string {
  if (!shape.style.fillColor) return "neutral";
  const upper = shape.style.fillColor.toUpperCase();
  return COLOR_TO_ROLE[upper] ?? "neutral";
}

function inferShapeType(shape: ReadbackShape): string {
  // Annotations: no stroke or very thin stroke with no fill
  if (shape.style.strokeThickness === 0) return "annotation";
  if (shape.style.cornerRadius === 0) return "rectangle";
  if (shape.style.cornerRadius >= 20) return "pill";
  return "rounded_rectangle";
}

function parseLabel(text: string): { label: string; sublabel?: string } {
  if (!text || text === "undefined") return { label: "" };
  const lines = text.split("\n");
  if (lines.length === 1) return { label: lines[0] };
  // First line is label, rest is sublabel (rejoin with newlines)
  return { label: lines[0], sublabel: lines.slice(1).join("\n") };
}

function shapeToNode(shape: ReadbackShape): ExtractedNode {
  const { label, sublabel } = parseLabel(shape.text);
  const shapeType = inferShapeType(shape);
  const role = shapeType === "annotation" ? "neutral" : inferRole(shape);

  const node: ExtractedNode = {
    id: shape.name || shape.id,
    label,
    role,
    shape: shapeType,
    width: Math.round(shape.geometry.width),
    height: Math.round(shape.geometry.height),
    x: Math.round(shape.geometry.x),
    y: Math.round(shape.geometry.y),
    font_size: shape.textStyle.textSize,
  };

  if (sublabel) node.sublabel = sublabel;
  if (shapeType === "annotation") node.opacity = 0;
  if (shape.textStyle.textColor && shape.textStyle.textColor !== "#2D3748") {
    node.text_color = shape.textStyle.textColor;
  }

  return node;
}

function lineToConnection(line: ReadbackLine): ExtractedConnection | null {
  if (!line.source || !line.destination) return null;

  const conn: ExtractedConnection = {
    from: line.source,
    to: line.destination,
    line_type: LINE_TYPE_MAP[line.style.lineType] ?? "straight",
  };

  if (line.text && line.text !== "undefined" && line.text !== "") {
    conn.label = line.text;
  }

  return conn;
}

/**
 * Extract a create_diagram-compatible spec from the frontmost OmniGraffle document.
 */
export function extractDiagramSpec(): ExtractedSpec {
  const readback = readDiagramState();
  const canvas = readback.canvases[0];
  if (!canvas) {
    throw new Error("No canvas found in frontmost document.");
  }

  const nodes = canvas.shapes.map(shapeToNode);
  const connections = canvas.lines
    .map(lineToConnection)
    .filter((c): c is ExtractedConnection => c !== null);

  return {
    title: readback.document.name,
    layout: "manual",
    nodes,
    connections,
  };
}
