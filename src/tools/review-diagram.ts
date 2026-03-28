import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import type { ReviewDiagramInput, ReviewFinding, ReviewResult, ReviewSeverity } from "../types/review.js";
import {
  readDiagramState,
  checkTextOverflow,
  checkTextTooSmall,
  checkShapeOverlap,
  checkInconsistentSizing,
  checkInconsistentFontSize,
  checkThinStrokes,
  checkTextContrast,
  fixTextOverflow,
  fixShapeOverlap,
  type DiagramReadback,
  type FixApplied as BridgeFixApplied,
} from "../bridge/review.js";

interface CheckConfig {
  id: string;
  name: string;
  description: string;
  type: "automated" | "prompt";
  severity: ReviewSeverity;
  params?: Record<string, unknown>;
  prompt?: string;
}

function loadChecksConfig(): CheckConfig[] {
  const configPath = path.join(process.cwd(), "review", "checks.yaml");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Review config not found at ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = yaml.parse(raw) as { checks: CheckConfig[] };
  return parsed.checks;
}

const SEVERITY_ORDER: Record<ReviewSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export const reviewDiagramTool = {
  name: "review_diagram",
  description:
    "Review the frontmost OmniGraffle diagram for common issues: text overflow, overlapping shapes, inconsistent sizing, contrast problems, and more. Returns findings with severity levels and prompts for visual review.",

  async execute(params: Record<string, unknown>): Promise<{
    content: Array<{ type: "text"; text: string }>;
  }> {
    const args = params as unknown as ReviewDiagramInput;
    const { checks: checkFilter, severity_filter, auto_fix } = args;
    const minSeverity = severity_filter ?? "info";
    const minOrder = SEVERITY_ORDER[minSeverity];

    const allChecks = loadChecksConfig();
    const activeChecks = checkFilter
      ? allChecks.filter(c => checkFilter.includes(c.id))
      : allChecks;

    const readback = readDiagramState();
    const canvas = readback.canvases[0];
    if (!canvas) {
      return {
        content: [{ type: "text", text: "No canvas found in frontmost document." }],
      };
    }

    const findings: ReviewFinding[] = [];
    const prompts: Array<{ checkId: string; prompt: string }> = [];

    for (const check of activeChecks) {
      if (SEVERITY_ORDER[check.severity] > minOrder) continue;

      if (check.type === "automated") {
        const checkFindings = runAutomatedCheck(check, canvas);
        findings.push(...checkFindings);
      }

      if (check.type === "prompt" && check.prompt) {
        prompts.push({
          checkId: check.id,
          prompt: interpolatePrompt(check.prompt, check.params ?? {}, canvas),
        });
      }
    }

    // Apply auto-fixes if requested (order matters: widen first, then shift)
    const fixes: BridgeFixApplied[] = [];
    if (auto_fix) {
      fixes.push(...fixTextOverflow(findings));
      fixes.push(...fixShapeOverlap(findings, canvas.shapes));
    }

    // If fixes were applied, re-run checks to get updated findings
    let finalFindings = findings;
    if (fixes.length > 0) {
      const recheck = readDiagramState();
      const recheckCanvas = recheck.canvases[0];
      if (recheckCanvas) {
        const recheckFindings: ReviewFinding[] = [];
        for (const check of activeChecks) {
          if (SEVERITY_ORDER[check.severity] > minOrder) continue;
          if (check.type === "automated") {
            recheckFindings.push(...runAutomatedCheck(check, recheckCanvas));
          }
        }
        finalFindings = recheckFindings;
      }
    }

    const result: ReviewResult = {
      diagramTitle: readback.document.name,
      canvasName: canvas.name,
      shapeCount: canvas.shapes.length,
      lineCount: canvas.lines.length,
      findings: finalFindings.filter(f => SEVERITY_ORDER[f.severity] <= minOrder),
      prompts,
      summary: {
        errors: finalFindings.filter(f => f.severity === "error").length,
        warnings: finalFindings.filter(f => f.severity === "warning").length,
        infos: finalFindings.filter(f => f.severity === "info").length,
      },
    };

    const output = formatReviewOutput(result, fixes);
    return { content: [{ type: "text", text: output }] };
  },
};

function runAutomatedCheck(
  check: CheckConfig,
  canvas: DiagramReadback["canvases"][0],
): ReviewFinding[] {
  const shapes = canvas.shapes;
  const p = check.params ?? {};

  switch (check.id) {
    case "text_overflow":
      return checkTextOverflow(shapes, p.char_width_factor as number, p.h_padding as number);
    case "text_too_small":
      return checkTextTooSmall(shapes, p.min_fill_ratio as number);
    case "shape_overlap":
      return checkShapeOverlap(shapes, p.min_overlap_px as number);
    case "inconsistent_sizing":
      return checkInconsistentSizing(shapes, p.tolerance_px as number);
    case "inconsistent_font_size":
      return checkInconsistentFontSize(shapes);
    case "thin_strokes":
      return checkThinStrokes(shapes, p.min_stroke_px as number);
    case "text_contrast":
      return checkTextContrast(shapes, p.min_luminance_diff as number);
    default:
      return [];
  }
}

function interpolatePrompt(
  template: string,
  params: Record<string, unknown>,
  canvas: DiagramReadback["canvases"][0],
): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  result = result.replace("{shapeCount}", String(canvas.shapes.length));
  result = result.replace("{lineCount}", String(canvas.lines.length));
  return result;
}

function formatReviewOutput(result: ReviewResult, fixes: BridgeFixApplied[] = []): string {
  const lines: string[] = [];
  lines.push(`## Diagram Review: ${result.canvasName}`);
  lines.push(`Shapes: ${result.shapeCount} | Lines: ${result.lineCount}`);
  lines.push("");

  const applied = fixes.filter(f => f.after && Object.keys(f.after).length > 0);
  const escalations = fixes.filter(f => !f.after || Object.keys(f.after).length === 0);

  if (applied.length > 0) {
    lines.push(`### Auto-Fixed: ${applied.length} issue(s)`);
    for (const fix of applied) {
      lines.push(`- **${fix.shapeName}**: ${fix.description}`);
    }
    lines.push("");
  }

  if (escalations.length > 0) {
    lines.push(`### Needs Spec Change: ${escalations.length} issue(s)`);
    for (const e of escalations) {
      lines.push(`- **${e.shapeName}**: ${e.description}`);
    }
    lines.push("");
  }

  const { errors, warnings, infos } = result.summary;
  if (errors === 0 && warnings === 0) {
    if (fixes.length > 0) {
      lines.push("All issues resolved after auto-fix.");
    } else {
      lines.push("All automated checks passed.");
    }
  } else {
    lines.push(`Remaining: ${errors} error(s), ${warnings} warning(s), ${infos} info(s)`);
  }
  lines.push("");

  if (result.findings.length > 0) {
    lines.push("### Findings");
    for (const f of result.findings) {
      const icon = f.severity === "error" ? "[ERROR]" : f.severity === "warning" ? "[WARN]" : "[INFO]";
      lines.push(`${icon} **${f.checkId}**: ${f.message}`);
    }
    lines.push("");
  }

  if (result.prompts.length > 0) {
    lines.push("### Visual Review Prompts");
    for (const p of result.prompts) {
      lines.push(`**${p.checkId}:**`);
      lines.push(p.prompt.trim());
      lines.push("");
    }
  }

  return lines.join("\n");
}
