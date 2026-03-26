import type { ExportFormat } from "../types/diagram.js";

export interface BuildExportScriptOptions {
  documentPath?: string;
  outputPath: string;
  format: ExportFormat;
  canvasName?: string;
  dpi: number;
}

function formatToOmniGraffle(format: ExportFormat): string {
  const map: Record<ExportFormat, string> = {
    pdf: "com.adobe.pdf",
    svg: "public.svg-image",
    png: "public.png",
    tiff: "public.tiff",
  };
  return map[format];
}

export function buildExportScript(opts: BuildExportScriptOptions): string {
  const { documentPath, outputPath, format, canvasName, dpi } = opts;
  const ogFormat = formatToOmniGraffle(format);

  return `
var og = Application("OmniGraffle");
og.activate();

var doc = ${documentPath ? `og.open(Path(${JSON.stringify(documentPath)}))` : "og.documents[0]"};

if (!doc) {
  throw new Error("No OmniGraffle document is open");
}

${canvasName ? `
var targetCanvas = null;
for (var i = 0; i < doc.canvases.length; i++) {
  if (doc.canvases[i].name() === ${JSON.stringify(canvasName)}) {
    targetCanvas = doc.canvases[i];
    break;
  }
}
if (!targetCanvas) {
  throw new Error("Canvas not found: ${canvasName}");
}
doc.currentCanvas = targetCanvas;
` : ""}

doc.save({ in: Path(${JSON.stringify(outputPath)}), as: ${JSON.stringify(ogFormat)} });

"exported:" + ${JSON.stringify(outputPath)};
`;
}
