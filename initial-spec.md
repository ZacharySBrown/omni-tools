# `diagrammer-mcp` — OmniGraffle Diagram Engine for Claude Code
### Full Product Specification · Ready for Agentic Build

---

## 1. Project Overview

### 1.1 Name & Tagline
**`diagrammer-mcp`** — *Claude Code → beautiful illustrated technical diagrams in OmniGraffle, one prompt at a time.*

### 1.2 Purpose
An MCP (Model Context Protocol) server that enables Claude Code to create high-fidelity illustrated technical diagrams and presentation slides inside OmniGraffle on macOS, styled after the visual language popularized by Jay Alammar's *Illustrated Transformer/BERT/GPT-2* series — clear, color-coded, flat-illustrated, and optimized for communicating AI/ML and software architecture concepts to general technical audiences.

### 1.3 Goals
- Allow Claude Code to generate complete OmniGraffle documents from natural-language descriptions or structured JSON specs
- Enforce consistent visual style through loaded style presets (two shipped defaults, user-extensible)
- Support both **slide content** (16:9 presentation canvases) and **architecture/data-flow diagrams**
- Support multi-format export: PDF, SVG, PNG
- Extract visual style tokens from existing OmniGraffle documents (for bootstrapping from existing decks)
- Accept Mermaid syntax as an input format for quick architecture diagram generation
- Run entirely locally on macOS with no external API dependencies

### 1.4 Non-Goals
- Not a web service or cloud tool
- Not a replacement for manual OmniGraffle design work; produces 80%-ready output for human refinement
- Not cross-platform (macOS only due to OmniGraffle dependency)
- Not a general-purpose Figma/Sketch replacement

### 1.5 Target User
**Zachary S. Brown** — PhD physicist, AI/ML engineer, technical communicator, data science community leader (Richmond, VA). Needs to produce clear technical visuals for talks (AnacondaCon, PyData), documentation, and client-facing AI consulting work. Primary workflow is Claude Code in the terminal. Owns OmniGraffle Pro.

### 1.6 Success Criteria
- Claude Code can create a styled architecture diagram from a one-sentence description in under 30 seconds
- Output visually matches the illustrated-transformer aesthetic without any manual OmniGraffle editing for basic diagrams
- Style presets are swappable via a single parameter
- PDF export works headlessly from within a Claude Code session

---

## 2. Architecture Specification

### 2.1 Runtime & Language
- **Node.js 20+** with **TypeScript 5+**
- Compiled to `dist/` via `tsc`, entry point `dist/index.js`
- Transport: **stdio** (Claude Code spawns the process)

### 2.2 Key Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

Optional runtime dependencies (checked at startup, degrade gracefully if absent):
- `mmdc` (Mermaid CLI, `npm install -g @mermaid-js/mermaid-cli`) — for `generate_from_mermaid`
- `d2` (D2 CLI, `brew install d2`) — future use

### 2.3 Directory Structure

```
diagrammer-mcp/
├── src/
│   ├── index.ts                  # MCP server entry point
│   ├── tools/
│   │   ├── create_diagram.ts
│   │   ├── create_slide.ts
│   │   ├── create_slide_deck.ts
│   │   ├── apply_style_preset.ts
│   │   ├── export_diagram.ts
│   │   ├── list_style_presets.ts
│   │   ├── add_element.ts
│   │   ├── generate_from_mermaid.ts
│   │   └── extract_style_from_document.ts
│   ├── omnigraffle/
│   │   ├── bridge.ts             # osascript execution wrapper
│   │   ├── scripts/
│   │   │   ├── create_canvas.js.template
│   │   │   ├── add_shape.js.template
│   │   │   ├── add_line.js.template
│   │   │   ├── apply_layout.js.template
│   │   │   └── export_canvas.js.template
│   │   └── types.ts              # OmniGraffle type definitions
│   ├── style/
│   │   ├── loader.ts             # loads and validates style preset JSON
│   │   └── types.ts              # StyleTokens interface
│   └── utils/
│       ├── schema.ts             # Zod schemas shared across tools
│       └── logger.ts
├── presets/
│   ├── illustrated-technical.json
│   └── clean-academic.json
├── dist/                         # compiled output (gitignored)
├── tsconfig.json
├── package.json
└── README.md
```

### 2.4 Configuration

**`.mcp.json`** (project-level Claude Code config):
```json
{
  "mcpServers": {
    "diagrammer": {
      "command": "node",
      "args": ["/absolute/path/to/diagrammer-mcp/dist/index.js"],
      "env": {
        "DIAGRAMMER_PRESETS_DIR": "/absolute/path/to/diagrammer-mcp/presets",
        "DIAGRAMMER_DEFAULT_PRESET": "illustrated-technical",
        "DIAGRAMMER_OUTPUT_DIR": "~/Desktop/diagrams"
      }
    }
  }
}
```

Or register with a single command:
```bash
claude mcp add diagrammer -- node /path/to/diagrammer-mcp/dist/index.js
```

### 2.5 MCP Server Bootstrap (`src/index.ts`)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer({
  name: "diagrammer-mcp",
  version: "1.0.0",
  description: "Create styled OmniGraffle diagrams and slides from Claude Code"
});

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 3. Style System

### 3.1 Visual DNA — Reference Sources

The style system is synthesized from three sources:

**Jay Alammar's Illustrated Series** (illustrated-transformer, illustrated-bert, illustrated-gpt2):
- Flat colored rectangles as first-class visual primitives (no gradients, no shadows on data blocks)
- Strong semantic color-coding: encoder components always one color, decoder another, attention a third
- Token sequences shown as horizontal rows of colored cells with text labels
- Data flow shown with clean directional arrows, not complex connectors
- White or very light grey backgrounds — content is the signal, background is nothing
- Generous whitespace; diagrams breathe
- Labels directly on or immediately adjacent to shapes, in a clean sans-serif
- "Highlight" color (bright yellow or orange) used sparingly to indicate the active/current element in a sequence diagram
- Consistent rounded corner radius (~8px equivalent) on all boxes

**Zak's existing slides (PyData Miami 2019, AnacondaCon 2019)**:
- White background, minimal ornamentation
- Clean section title + content structure
- Architecture diagrams use simple labeled boxes with arrows
- Code snippets in monospace blocks
- Academic/technical tone — informative over decorative
- Standard slide ratio (16:9)

**Distill.pub / Colah's blog aesthetic**:
- Generous use of color to distinguish functional components
- Mathematical clarity — shapes and positions are meaningful
- Annotations and callout labels in lighter weight type
- SVG-quality crispness

### 3.2 Style Token Schema (`src/style/types.ts`)

```typescript
export interface StyleTokens {
  meta: {
    name: string;
    description: string;
    version: string;
  };
  colors: {
    background: string;        // canvas background
    surface: string;           // card/box default fill
    surface_alt: string;       // alternating surface (e.g., decoder vs encoder)
    primary: string;           // primary action/component color
    secondary: string;         // secondary component color
    accent: string;            // highlight / active element
    accent_warm: string;       // warm accent for data/value nodes
    text_primary: string;      // main label text
    text_secondary: string;    // annotation, caption text
    text_on_primary: string;   // text on primary-colored fills
    text_on_secondary: string; // text on secondary-colored fills
    connector: string;         // arrow/line stroke color
    connector_highlight: string; // emphasized flow arrow
    code_bg: string;           // code block background
    code_text: string;         // code block text
    border: string;            // subtle border/divider
    success: string;
    warning: string;
    danger: string;
  };
  semantic_roles: {
    // Maps diagram semantic roles to color names
    encoder: string;           // → primary
    decoder: string;           // → secondary
    attention: string;         // → accent_warm
    embedding: string;         // → accent
    output: string;            // → success
    input: string;             // → surface
    intermediate: string;      // → surface_alt
  };
  typography: {
    heading_font: string;
    body_font: string;
    code_font: string;
    label_font: string;
    sizes: {
      xxl: number;   // slide title (pt)
      xl: number;    // section header
      lg: number;    // diagram section label
      md: number;    // node label
      sm: number;    // annotation / caption
      xs: number;    // tiny label / subscript
      code: number;  // code block
    };
    weights: {
      title: string;
      label: string;
      annotation: string;
    };
  };
  shapes: {
    default_corner_radius: number;   // pts
    node_corner_radius: number;
    pill_corner_radius: number;      // for token cell style
    stroke_width_default: number;
    stroke_width_emphasis: number;
    stroke_width_subtle: number;
    min_node_width: number;
    min_node_height: number;
    token_cell_width: number;        // width of a token rectangle
    token_cell_height: number;
    shadow: boolean;
    shadow_blur: number;
    shadow_offset_x: number;
    shadow_offset_y: number;
    shadow_color: string;
  };
  connectors: {
    default_stroke: string;
    default_width: number;
    arrow_style: "FilledArrow" | "OpenArrow" | "StealthArrow";
    routing: "orthogonal" | "curved" | "direct";
    label_font_size: number;
  };
  layout: {
    canvas_width_slide: number;     // 1920
    canvas_height_slide: number;    // 1080
    canvas_width_diagram: number;   // 1600
    canvas_height_diagram: number;  // 1200
    margin: number;
    node_h_spacing: number;
    node_v_spacing: number;
    title_margin_top: number;
    content_margin_top: number;
  };
}
```

### 3.3 Preset: `illustrated-technical.json`

```json
{
  "meta": {
    "name": "illustrated-technical",
    "description": "Jay Alammar Illustrated Transformer aesthetic — flat, color-coded, semantic, for ML/AI concept diagrams",
    "version": "1.0.0"
  },
  "colors": {
    "background": "#FFFFFF",
    "surface": "#F0F4FF",
    "surface_alt": "#FFF0F5",
    "primary": "#4A90D9",
    "secondary": "#E87878",
    "accent": "#68C3A3",
    "accent_warm": "#F5A623",
    "text_primary": "#1A1A2E",
    "text_secondary": "#6B7280",
    "text_on_primary": "#FFFFFF",
    "text_on_secondary": "#FFFFFF",
    "connector": "#4A5568",
    "connector_highlight": "#F5A623",
    "code_bg": "#F7F8FA",
    "code_text": "#2D3748",
    "border": "#E2E8F0",
    "success": "#48BB78",
    "warning": "#ED8936",
    "danger": "#FC8181"
  },
  "semantic_roles": {
    "encoder": "primary",
    "decoder": "secondary",
    "attention": "accent_warm",
    "embedding": "accent",
    "output": "success",
    "input": "surface",
    "intermediate": "surface_alt"
  },
  "typography": {
    "heading_font": "Helvetica Neue",
    "body_font": "Helvetica Neue",
    "code_font": "Menlo",
    "label_font": "Helvetica Neue",
    "sizes": {
      "xxl": 48,
      "xl": 32,
      "lg": 22,
      "md": 16,
      "sm": 12,
      "xs": 10,
      "code": 13
    },
    "weights": {
      "title": "Bold",
      "label": "Medium",
      "annotation": "Regular"
    }
  },
  "shapes": {
    "default_corner_radius": 8,
    "node_corner_radius": 8,
    "pill_corner_radius": 20,
    "stroke_width_default": 1.5,
    "stroke_width_emphasis": 2.5,
    "stroke_width_subtle": 0.5,
    "min_node_width": 120,
    "min_node_height": 48,
    "token_cell_width": 80,
    "token_cell_height": 40,
    "shadow": false,
    "shadow_blur": 0,
    "shadow_offset_x": 0,
    "shadow_offset_y": 0,
    "shadow_color": "#00000020"
  },
  "connectors": {
    "default_stroke": "#4A5568",
    "default_width": 2.0,
    "arrow_style": "FilledArrow",
    "routing": "orthogonal",
    "label_font_size": 11
  },
  "layout": {
    "canvas_width_slide": 1920,
    "canvas_height_slide": 1080,
    "canvas_width_diagram": 1600,
    "canvas_height_diagram": 1200,
    "margin": 80,
    "node_h_spacing": 60,
    "node_v_spacing": 40,
    "title_margin_top": 60,
    "content_margin_top": 140
  }
}
```

### 3.4 Preset: `clean-academic.json`

```json
{
  "meta": {
    "name": "clean-academic",
    "description": "Zak Brown PyData/AnacondaCon style — white background, minimal, technical, clean academic aesthetic",
    "version": "1.0.0"
  },
  "colors": {
    "background": "#FFFFFF",
    "surface": "#F5F5F5",
    "surface_alt": "#EEF2FF",
    "primary": "#2C5F8A",
    "secondary": "#6B7280",
    "accent": "#3B82F6",
    "accent_warm": "#F59E0B",
    "text_primary": "#111827",
    "text_secondary": "#6B7280",
    "text_on_primary": "#FFFFFF",
    "text_on_secondary": "#FFFFFF",
    "connector": "#374151",
    "connector_highlight": "#3B82F6",
    "code_bg": "#F3F4F6",
    "code_text": "#1F2937",
    "border": "#D1D5DB",
    "success": "#059669",
    "warning": "#D97706",
    "danger": "#DC2626"
  },
  "semantic_roles": {
    "encoder": "primary",
    "decoder": "accent",
    "attention": "accent_warm",
    "embedding": "surface_alt",
    "output": "success",
    "input": "surface",
    "intermediate": "secondary"
  },
  "typography": {
    "heading_font": "Helvetica Neue",
    "body_font": "Helvetica Neue",
    "code_font": "Menlo",
    "label_font": "Helvetica Neue",
    "sizes": {
      "xxl": 44,
      "xl": 30,
      "lg": 20,
      "md": 15,
      "sm": 11,
      "xs": 9,
      "code": 12
    },
    "weights": {
      "title": "Bold",
      "label": "Regular",
      "annotation": "Light"
    }
  },
  "shapes": {
    "default_corner_radius": 4,
    "node_corner_radius": 4,
    "pill_corner_radius": 16,
    "stroke_width_default": 1.0,
    "stroke_width_emphasis": 2.0,
    "stroke_width_subtle": 0.5,
    "min_node_width": 100,
    "min_node_height": 44,
    "token_cell_width": 72,
    "token_cell_height": 36,
    "shadow": false,
    "shadow_blur": 0,
    "shadow_offset_x": 0,
    "shadow_offset_y": 0,
    "shadow_color": "#00000010"
  },
  "connectors": {
    "default_stroke": "#374151",
    "default_width": 1.5,
    "arrow_style": "FilledArrow",
    "routing": "orthogonal",
    "label_font_size": 10
  },
  "layout": {
    "canvas_width_slide": 1920,
    "canvas_height_slide": 1080,
    "canvas_width_diagram": 1400,
    "canvas_height_diagram": 1050,
    "margin": 80,
    "node_h_spacing": 50,
    "node_v_spacing": 36,
    "title_margin_top": 60,
    "content_margin_top": 130
  }
}
```

---

## 4. OmniGraffle Automation Bridge

### 4.1 `src/omnigraffle/bridge.ts`

```typescript
import { execSync, execFileSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

export interface BridgeResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Execute a JavaScript for Automation (JXA) script via osascript.
 * OmniGraffle must be installed. It will be launched automatically if not running.
 */
export function runOmniJS(script: string, timeoutMs = 30000): BridgeResult {
  try {
    const output = execFileSync("osascript", ["-l", "JavaScript", "-e", script], {
      timeout: timeoutMs,
      encoding: "utf8"
    });
    return { success: true, output: output.trim() };
  } catch (err: any) {
    return {
      success: false,
      error: err.stderr || err.message || "Unknown osascript error"
    };
  }
}

/**
 * Write a JXA script to a temp file and execute it (avoids shell escaping issues
 * for complex scripts with nested quotes).
 */
export function runOmniJSFile(script: string, timeoutMs = 60000): BridgeResult {
  const tmpPath = `/tmp/diagrammer_${Date.now()}.js`;
  try {
    fs.writeFileSync(tmpPath, script, "utf8");
    const output = execFileSync("osascript", ["-l", "JavaScript", tmpPath], {
      timeout: timeoutMs,
      encoding: "utf8"
    });
    return { success: true, output: output.trim() };
  } catch (err: any) {
    return {
      success: false,
      error: err.stderr || err.message || "Unknown osascript error"
    };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

/** Check if OmniGraffle is available on this system */
export function checkOmniGraffleAvailable(): boolean {
  try {
    execSync("osascript -e 'application \"OmniGraffle\" exists'", { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}
```

### 4.2 Core OmniJS Patterns

All OmniJS scripts run inside OmniGraffle's JavaScript for Automation context. The OmniGraffle application object is always the entry point.

#### Canvas Creation Pattern
```javascript
// Run via runOmniJSFile()
var og = Application("OmniGraffle");
og.activate();

// Create new document
var doc = og.Document().make();

// Configure first canvas
var canvas = doc.canvases[0];
canvas.name = "Diagram";
canvas.size = { width: 1920, height: 1080 };
canvas.background.color = og.Color({ red: 1, green: 1, blue: 1, alpha: 1 });

// Set canvas units to points
canvas.canvasSize = "points";
```

#### Color Helper (include in every script)
```javascript
function hex2color(hex) {
  // hex: "#RRGGBB"
  var r = parseInt(hex.slice(1,3), 16) / 255;
  var g = parseInt(hex.slice(3,5), 16) / 255;
  var b = parseInt(hex.slice(5,7), 16) / 255;
  return og.Color({ red: r, green: g, blue: b, alpha: 1 });
}
```

#### Shape Creation Pattern
```javascript
// Create a rounded rectangle node
var shape = og.Shape.make({ within: canvas });
shape.geometry = { x: 100, y: 100, width: 160, height: 60 };
shape.shapeType = "rectangle";

// Fill
shape.fillColor = hex2color("#4A90D9");
shape.strokeColor = hex2color("#4A90D9");
shape.strokeWidth = 1.5;
shape.cornerRadius = 8;

// Text
shape.textHorizontalPadding = 10;
shape.textVerticalPadding = 8;
shape.text = og.RichText({
  text: "Self-Attention",
  font: og.Font({ name: "Helvetica Neue", size: 16 }),
  color: hex2color("#FFFFFF"),
  alignment: "center"
});
```

#### Line/Connector Creation Pattern
```javascript
// Draw a line from shape A to shape B
var line = og.Line.make({ within: canvas });
line.tail = shapeA;  // source shape object
line.head = shapeB;  // destination shape object
line.strokeColor = hex2color("#4A5568");
line.strokeWidth = 2.0;
line.headType = "FilledArrow";
line.tailType = "None";
line.lineType = "orthogonal";  // or "curved", "bezier", "straight"
```

#### Export Pattern
```javascript
// Export canvas to PDF
var exportPath = "/Users/username/Desktop/diagrams/output.pdf";
var exportSettings = og.ExportSettings({ exportFormat: "PDF" });
doc.export({ as: exportSettings, to: Path(exportPath) });
```

---

## 5. Tool Specifications

### Tool 1: `create_diagram`

**Description**: Create a new OmniGraffle diagram from a structured specification of nodes and connections. Supports architecture diagrams, data flow diagrams, sequence diagrams, and component diagrams.

**Input Schema** (Zod):
```typescript
const NodeSchema = z.object({
  id: z.string(),                           // unique identifier for connections
  label: z.string(),
  role: z.enum([                            // maps to semantic color
    "encoder", "decoder", "attention", "embedding",
    "output", "input", "intermediate", "neutral"
  ]).default("neutral"),
  shape: z.enum([
    "rectangle", "rounded_rectangle", "diamond",
    "circle", "token_cell", "pill", "annotation"
  ]).default("rounded_rectangle"),
  color_override: z.string().optional(),    // hex, overrides role color
  x: z.number().optional(),                // manual position (omit for auto-layout)
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sublabel: z.string().optional(),          // smaller annotation text below label
});

const ConnectionSchema = z.object({
  from: z.string(),                         // node id
  to: z.string(),                           // node id
  label: z.string().optional(),
  style: z.enum(["default", "highlight", "dashed", "bidirectional"]).default("default"),
  color_override: z.string().optional(),
});

const CreateDiagramInput = z.object({
  title: z.string(),
  description: z.string().optional(),       // for Claude's own context, not rendered
  nodes: z.array(NodeSchema),
  connections: z.array(ConnectionSchema),
  layout: z.enum([
    "auto_hierarchical",   // top-to-bottom, best for pipelines
    "auto_force",          // organic, best for networks
    "auto_circular",       // radial, best for attention diagrams
    "manual"               // use x/y coords on nodes
  ]).default("auto_hierarchical"),
  canvas_type: z.enum(["diagram", "slide"]).default("diagram"),
  style_preset: z.string().default("illustrated-technical"),
  output_path: z.string().optional(),       // if set, auto-export to PDF after creation
  output_format: z.enum(["pdf", "svg", "png"]).optional(),
});
```

**Implementation Logic**:
1. Load style preset from `DIAGRAMMER_PRESETS_DIR`
2. Build a JXA script string using node/connection data + style tokens
3. Write script to temp file via `runOmniJSFile()`
4. OmniGraffle creates document, applies canvas size, creates all shapes, draws connections
5. If `layout` is auto-*, invoke OmniGraffle's built-in layout engine after shapes are placed
6. If `output_path` set, run export after creation
7. Return document path and success/error status

**OmniJS Script Template** (abbreviated — full version in `src/omnigraffle/scripts/create_diagram.template.js`):
```javascript
// TEMPLATE — variables injected by TypeScript before execution
var og = Application("OmniGraffle");
og.activate();

var PRESET = __PRESET_JSON__;  // injected: full style token object
var NODES = __NODES_JSON__;    // injected: array of node specs
var CONNECTIONS = __CONNECTIONS_JSON__;  // injected: connection specs
var TITLE = "__TITLE__";
var LAYOUT = "__LAYOUT__";
var CANVAS_W = __CANVAS_W__;
var CANVAS_H = __CANVAS_H__;

// --- Color helpers ---
function hex2color(hex) {
  var r = parseInt(hex.slice(1,3),16)/255;
  var g = parseInt(hex.slice(3,5),16)/255;
  var b = parseInt(hex.slice(5,7),16)/255;
  return og.Color({red:r, green:g, blue:b, alpha:1});
}

function roleToFillHex(role) {
  var roleMap = PRESET.semantic_roles;
  var colorKey = roleMap[role] || "surface";
  return PRESET.colors[colorKey] || PRESET.colors.surface;
}

function roleToTextHex(role) {
  var darkRoles = ["encoder","decoder","attention","output"];
  return darkRoles.includes(role) ? PRESET.colors.text_on_primary : PRESET.colors.text_primary;
}

// --- Create document ---
var doc = og.Document.make();
var canvas = doc.canvases[0];
canvas.name = TITLE;
canvas.size = { width: CANVAS_W, height: CANVAS_H };
canvas.fillColor = hex2color(PRESET.colors.background);

// --- Draw nodes ---
var shapeMap = {};
NODES.forEach(function(node) {
  var fill = node.color_override || roleToFillHex(node.role);
  var textColor = roleToTextHex(node.role);
  var w = node.width || PRESET.shapes.min_node_width;
  var h = node.height || PRESET.shapes.min_node_height;
  var x = node.x || 100;
  var y = node.y || 100;

  var s = og.Shape.make({ within: canvas });
  s.geometry = { x: x, y: y, width: w, height: h };
  s.shapeType = (node.shape === "diamond") ? "diamond" :
                (node.shape === "circle") ? "circle" : "rectangle";
  s.fillColor = hex2color(fill);
  s.strokeColor = hex2color(fill);
  s.strokeWidth = PRESET.shapes.stroke_width_default;
  s.cornerRadius = (node.shape === "pill") ?
    PRESET.shapes.pill_corner_radius : PRESET.shapes.node_corner_radius;
  // Note: set text via textFlow for rich text
  s.name = node.id;
  shapeMap[node.id] = s;
});

// --- Draw connections ---
CONNECTIONS.forEach(function(conn) {
  var src = shapeMap[conn.from];
  var dst = shapeMap[conn.to];
  if (!src || !dst) return;
  var line = og.Line.make({ within: canvas });
  line.tail = src;
  line.head = dst;
  var strokeHex = conn.color_override ||
    (conn.style === "highlight" ? PRESET.colors.connector_highlight : PRESET.colors.connector);
  line.strokeColor = hex2color(strokeHex);
  line.strokeWidth = (conn.style === "highlight") ?
    PRESET.connectors.default_width * 1.5 : PRESET.connectors.default_width;
  line.headType = PRESET.connectors.arrow_style;
  line.tailType = conn.style === "bidirectional" ? PRESET.connectors.arrow_style : "None";
  line.lineType = PRESET.connectors.routing;
  if (conn.style === "dashed") { line.strokePattern = "dash"; }
});

// --- Auto layout ---
if (LAYOUT !== "manual") {
  var layoutEngine = (LAYOUT === "auto_force") ? "force" :
                     (LAYOUT === "auto_circular") ? "circular" : "hierarchical";
  canvas.layoutInfo = { method: layoutEngine };
  canvas.layout();
}

"done:" + doc.file;
```

---

### Tool 2: `create_slide`

**Description**: Create a single presentation slide in OmniGraffle with a title, optional subtitle, body content (text or bullet list), and optional figure area. Uses 16:9 1920×1080 canvas.

**Input Schema**:
```typescript
const CreateSlideInput = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  body: z.union([
    z.string(),                             // freeform text block
    z.array(z.string()),                    // bullet list
  ]).optional(),
  figure: z.object({                        // optional right-side figure area
    nodes: z.array(NodeSchema),
    connections: z.array(ConnectionSchema),
    layout: z.enum(["auto_hierarchical","auto_force","manual"]).default("auto_hierarchical"),
  }).optional(),
  layout_mode: z.enum([
    "title_only",                           // just title + optional subtitle
    "title_body",                           // title left, body right
    "title_figure",                         // title + full-width figure
    "title_body_figure",                    // title, body left, figure right
  ]).default("title_body"),
  slide_number: z.number().optional(),
  style_preset: z.string().default("illustrated-technical"),
  output_path: z.string().optional(),
  output_format: z.enum(["pdf","svg","png"]).optional(),
});
```

**Implementation**: Same JXA bridge pattern. Title is placed as a large text shape at top. Body text placed as a styled text block. Figure area rendered in right 50% of canvas using node/connection specs. Slide number placed bottom-right.

---

### Tool 3: `create_slide_deck`

**Description**: Create a multi-slide OmniGraffle document where each canvas is one slide. Accepts an array of slide specs.

**Input Schema**:
```typescript
const CreateSlideDeckInput = z.object({
  deck_title: z.string(),
  slides: z.array(CreateSlideInput.omit({ output_path: true, output_format: true })),
  style_preset: z.string().default("illustrated-technical"),
  output_path: z.string().optional(),
  output_format: z.enum(["pdf","svg","png"]).optional(),
});
```

**Implementation**: Creates one OmniGraffle document. Loops over slide specs, creates one canvas per slide (named by slide title). Exports entire document as multi-page PDF if output_path given.

---

### Tool 4: `apply_style_preset`

**Description**: Apply a named style preset to all shapes in the currently open/frontmost OmniGraffle document. Useful for re-styling an existing diagram.

**Input Schema**:
```typescript
const ApplyStylePresetInput = z.object({
  preset_name: z.string(),
  scope: z.enum(["all_canvases", "current_canvas"]).default("current_canvas"),
  remap_by_role: z.boolean().default(true), // use shape names as role keys
});
```

**Implementation**: Opens frontmost OmniGraffle doc. Iterates all graphics on target canvases. For each shape whose `.name` matches a role key, applies role colors from preset. For all shapes, updates fonts and stroke widths. Non-destructive on geometry.

---

### Tool 5: `export_diagram`

**Description**: Export a specific OmniGraffle document (or the frontmost open document) to PDF, SVG, or PNG.

**Input Schema**:
```typescript
const ExportDiagramInput = z.object({
  document_path: z.string().optional(),    // if omitted, uses frontmost open doc
  output_path: z.string(),                 // full file path including extension
  format: z.enum(["pdf","svg","png","tiff"]),
  canvas_name: z.string().optional(),      // export specific canvas; omit for all
  dpi: z.number().default(144),            // for raster formats
});
```

**OmniJS Pattern**:
```javascript
var og = Application("OmniGraffle");
var doc = DOC_PATH ? og.open(Path(DOC_PATH)) : og.documents[0];
var exportSettings = og.ExportSettings({
  exportFormat: FORMAT,  // "PDF", "SVG", "PNG"
  resolution: DPI
});
doc.export({ as: exportSettings, to: Path(OUTPUT_PATH) });
"exported:" + OUTPUT_PATH;
```

---

### Tool 6: `list_style_presets`

**Description**: List all available style presets with their names and descriptions.

**Input Schema**: `z.object({})` (no input)

**Implementation**: Reads all `*.json` files from `DIAGRAMMER_PRESETS_DIR`, returns array of `{ name, description, version }`.

---

### Tool 7: `add_element`

**Description**: Add a single shape or connector to the frontmost OmniGraffle canvas. For incremental diagram building.

**Input Schema**:
```typescript
const AddElementInput = z.object({
  type: z.enum(["shape", "line", "text_annotation"]),
  label: z.string().optional(),
  role: z.enum(["encoder","decoder","attention","embedding","output","input","intermediate","neutral"]).default("neutral"),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  // for lines only:
  connect_from_name: z.string().optional(),  // name of source shape
  connect_to_name: z.string().optional(),    // name of target shape
  style_preset: z.string().default("illustrated-technical"),
});
```

---

### Tool 8: `generate_from_mermaid`

**Description**: Convert a Mermaid diagram definition into an OmniGraffle diagram. Renders Mermaid to SVG first, then imports/recreates in OmniGraffle with style preset applied.

**Input Schema**:
```typescript
const GenerateFromMermaidInput = z.object({
  mermaid_source: z.string(),              // full Mermaid diagram string
  style_preset: z.string().default("illustrated-technical"),
  output_path: z.string().optional(),
  output_format: z.enum(["pdf","svg","png"]).optional(),
});
```

**Implementation**:
1. Write Mermaid source to temp `.mmd` file
2. Run `mmdc -i input.mmd -o output.svg` via `execSync`
3. Open resulting SVG in OmniGraffle via `og.open(Path(svgPath))`
4. Apply style preset to all shapes in the opened canvas
5. Optionally export

**Prerequisite check**: At startup, `generate_from_mermaid` checks for `mmdc` binary. If not found, returns a helpful error: `"mmdc (Mermaid CLI) not found. Install with: npm install -g @mermaid-js/mermaid-cli"`

---

### Tool 9: `extract_style_from_document`

**Description**: Analyze an open or specified OmniGraffle document and extract its visual style as a new style preset JSON file. Useful for bootstrapping a preset from existing slides.

**Input Schema**:
```typescript
const ExtractStyleInput = z.object({
  document_path: z.string().optional(),    // if omitted, uses frontmost open doc
  output_preset_name: z.string(),          // name for the new preset
  output_preset_path: z.string().optional(), // if omitted, saves to DIAGRAMMER_PRESETS_DIR
});
```

**Implementation**:
1. Open document, iterate all shapes on all canvases
2. Sample fill colors, stroke colors, fonts, sizes, corner radii
3. Identify most-common values as defaults
4. Build a `StyleTokens` object from sampled values
5. Write to JSON file
6. Return path of written preset

---

## 6. Error Handling Strategy

All tools follow this pattern:
```typescript
try {
  const result = runOmniJSFile(script);
  if (!result.success) {
    return {
      content: [{
        type: "text",
        text: `OmniGraffle error: ${result.error}\n\nTroubleshooting:\n- Is OmniGraffle installed and licensed?\n- Check System Settings → Privacy & Security → Automation → allow Terminal/Claude Code to control OmniGraffle`
      }]
    };
  }
  return { content: [{ type: "text", text: `Success. ${result.output}` }] };
} catch (err) {
  return {
    content: [{
      type: "text",
      text: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    }],
    isError: true
  };
}
```

---

## 7. Setup and Installation

### Prerequisites
- macOS 12+ (Monterey or later)
- OmniGraffle Pro 7.12+ (for Omni Automation / OmniJS support)
- Node.js 20+
- `npm` or `yarn`
- Terminal/Claude Code granted Automation permission for OmniGraffle

### Installation Steps

```bash
# 1. Clone the repo
git clone https://github.com/yourname/diagrammer-mcp
cd diagrammer-mcp

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Grant macOS Automation permission
# Run this once — a permission dialog will appear
osascript -l JavaScript -e 'Application("OmniGraffle").name()'

# 5. Register with Claude Code (project-level)
claude mcp add diagrammer -- node $(pwd)/dist/index.js

# 6. Verify
claude mcp list
# Should show: diagrammer — node /path/to/dist/index.js
```

### Optional: Mermaid CLI
```bash
npm install -g @mermaid-js/mermaid-cli
# Verify:
mmdc --version
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `package.json` scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "node dist/index.js --test"
  }
}
```

---

## 8. Usage Examples

### Example 1: Transformer architecture diagram
**User prompt to Claude Code:**
> "Create an illustrated transformer encoder-decoder architecture diagram showing embeddings → encoder stack → cross-attention → decoder stack → output. Use the illustrated-technical style."

**Tool call**: `create_diagram`
```json
{
  "title": "Transformer Architecture",
  "nodes": [
    {"id": "input_tokens", "label": "Input Tokens", "role": "input", "shape": "token_cell"},
    {"id": "embedding", "label": "Embedding + Positional Encoding", "role": "embedding"},
    {"id": "encoder1", "label": "Encoder × 6", "role": "encoder"},
    {"id": "cross_attn", "label": "Cross-Attention", "role": "attention"},
    {"id": "decoder1", "label": "Decoder × 6", "role": "decoder"},
    {"id": "output_tokens", "label": "Output Tokens", "role": "output", "shape": "token_cell"}
  ],
  "connections": [
    {"from": "input_tokens", "to": "embedding"},
    {"from": "embedding", "to": "encoder1"},
    {"from": "encoder1", "to": "cross_attn", "style": "highlight"},
    {"from": "cross_attn", "to": "decoder1"},
    {"from": "decoder1", "to": "output_tokens"}
  ],
  "layout": "auto_hierarchical",
  "style_preset": "illustrated-technical",
  "output_path": "~/Desktop/diagrams/transformer.pdf",
  "output_format": "pdf"
}
```

---

### Example 2: RAG pipeline slide
**User prompt:**
> "Make a slide titled 'Retrieval-Augmented Generation Pipeline' showing the RAG flow: user query → embedding model → vector DB lookup → context retrieved → LLM → answer. Clean academic style."

**Tool call**: `create_slide`
```json
{
  "title": "Retrieval-Augmented Generation Pipeline",
  "layout_mode": "title_figure",
  "figure": {
    "nodes": [
      {"id": "query", "label": "User Query", "role": "input"},
      {"id": "embed", "label": "Embedding Model", "role": "encoder"},
      {"id": "vdb", "label": "Vector DB", "role": "intermediate"},
      {"id": "context", "label": "Retrieved Context", "role": "attention"},
      {"id": "llm", "label": "LLM", "role": "decoder"},
      {"id": "answer", "label": "Answer", "role": "output"}
    ],
    "connections": [
      {"from": "query", "to": "embed"},
      {"from": "embed", "to": "vdb"},
      {"from": "vdb", "to": "context", "label": "top-k"},
      {"from": "context", "to": "llm", "style": "highlight"},
      {"from": "query", "to": "llm"},
      {"from": "llm", "to": "answer"}
    ],
    "layout": "auto_hierarchical"
  },
  "style_preset": "clean-academic",
  "output_path": "~/Desktop/diagrams/rag_slide.pdf",
  "output_format": "pdf"
}
```

---

### Example 3: Codebase architecture diagram from Mermaid
**User prompt:**
> "Here's a Mermaid diagram of my service architecture. Turn it into an OmniGraffle diagram with the illustrated-technical style."

**Tool call**: `generate_from_mermaid`
```json
{
  "mermaid_source": "graph TD\n  API[API Gateway] --> Auth[Auth Service]\n  API --> Search[Search Service]\n  Search --> VDB[(Vector DB)]\n  Search --> Cache[(Redis Cache)]\n  Auth --> DB[(PostgreSQL)]",
  "style_preset": "illustrated-technical",
  "output_path": "~/Desktop/diagrams/service_arch.svg",
  "output_format": "svg"
}
```

---

### Example 4: Multi-slide deck
**User prompt:**
> "Create a 3-slide deck for my attention mechanism talk: slide 1 title only 'Understanding Attention', slide 2 showing Q/K/V vectors flowing into softmax into output, slide 3 with body text explaining multi-head attention."

**Tool call**: `create_slide_deck`

---

### Example 5: Extract style from existing slides
**User prompt:**
> "I have my AnacondaCon slides open in OmniGraffle. Extract the visual style and save it as a new preset called 'anacondacon-2019'."

**Tool call**: `extract_style_from_document`
```json
{
  "output_preset_name": "anacondacon-2019"
}
```

---

## 9. Illustrated Diagram Design Principles

These principles are encoded in the style presets and should guide Claude's node/connection specifications:

1. **Semantic color is the primary communication channel.** Every node should have a `role` set. Encoder components are always `encoder`-colored, decoders are always `decoder`-colored, etc. Never use color arbitrarily.

2. **Token rows use `token_cell` shape.** When showing sequences of tokens or embeddings, use `token_cell` nodes placed in a horizontal row (manual layout, evenly spaced at `token_cell_width + 8` intervals).

3. **Active element uses `accent` color.** When illustrating a step-by-step process (e.g., "processing word #3 in the sequence"), the active node gets `color_override: accent`. Others stay at role color.

4. **Data flows downward or left-to-right.** Use `auto_hierarchical` layout for pipelines. Reserve `auto_circular` for attention pattern diagrams.

5. **Arrows are minimal.** One arrowhead, never both ends unless explicitly bidirectional. `highlight` connections show the most important data path.

6. **Labels are short.** Node labels should be ≤ 3 words. Use `sublabel` for a 2nd line of clarification.

7. **Backgrounds are white.** Never use colored canvas backgrounds. Color lives on the shapes.

8. **Whitespace is generous.** Default spacing (`node_h_spacing: 60`, `node_v_spacing: 40`) should be respected. Don't pack nodes.

---

## 10. Roadmap

### Phase 1 — MVP (build first)
- [x] `create_diagram` with auto layout
- [x] `export_diagram`
- [x] `list_style_presets`
- [x] `illustrated-technical` and `clean-academic` presets
- [x] stdio MCP transport + Claude Code registration

### Phase 2 — Slides & Mermaid
- [ ] `create_slide` (single slide)
- [ ] `create_slide_deck` (multi-canvas)
- [ ] `generate_from_mermaid`
- [ ] `add_element` (incremental editing)

### Phase 3 — Style Intelligence
- [ ] `extract_style_from_document`
- [ ] `apply_style_preset` (re-style existing docs)
- [ ] Token row sequence diagram helper (auto-place horizontal token cells)
- [ ] D2 language input support (alternative to Mermaid)
- [ ] Stencil library: pre-built OmniGraffle stencil shapes for common ML components (transformer block, attention head, MLP block, etc.)

### Phase 4 — Polish
- [ ] OmniGraffle template files (`.graffle`) for slide master layouts
- [ ] Multi-export: export all canvases as individual PNGs (for slide deck image assets)
- [ ] Watch mode: monitor a JSON diagram spec file and auto-refresh OmniGraffle on change
- [ ] Web viewer: serve exported SVGs as a local HTML page for quick preview

---

## 11. Appendix: Quick OmniJS Reference

| Task | OmniJS method |
|---|---|
| New document | `og.Document.make()` |
| Get canvas | `doc.canvases[0]` or `doc.canvases.byName("Name")` |
| New shape | `og.Shape.make({ within: canvas })` |
| New line | `og.Line.make({ within: canvas })` |
| Set geometry | `shape.geometry = { x, y, width, height }` |
| Set fill | `shape.fillColor = og.Color({ red, green, blue, alpha })` |
| Set stroke | `shape.strokeColor`, `shape.strokeWidth` |
| Corner radius | `shape.cornerRadius = 8` |
| Shape type | `shape.shapeType = "rectangle"` / `"diamond"` / `"circle"` |
| Connect line | `line.tail = shapeA; line.head = shapeB` |
| Arrow head | `line.headType = "FilledArrow"` |
| Line routing | `line.lineType = "orthogonal"` |
| Auto layout | `canvas.layout()` after setting `canvas.layoutInfo` |
| Export | `doc.export({ as: og.ExportSettings({ exportFormat: "PDF" }), to: Path(p) })` |
| Open file | `og.open(Path("/path/to/file.graffle"))` |
| Save | `doc.save()` |
| Canvas size | `canvas.size = { width: 1920, height: 1080 }` |
