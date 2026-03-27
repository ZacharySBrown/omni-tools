#!/bin/bash
# Generate all prompt_flags diagrams via the diagrammer-mcp tools.
# Run after: npm run build && claude mcp add diagrammer -- node $(pwd)/dist/index.js
#
# These are create_diagram tool call specs. To use:
# 1. Open a Claude Code session with diagrammer registered
# 2. Ask Claude to create each diagram, or paste the JSON as tool input

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIAGRAMS_DIR=~/Desktop/diagrams
mkdir -p "$DIAGRAMS_DIR"

echo "=== prompt_flags Diagram Specs ==="
echo ""
echo "4 diagrams ready in $SCRIPT_DIR/:"
echo "  1. prompt-flags-architecture.json    — Package dependency flow"
echo "  2. prompt-flags-domain-model.json    — Core entities & relationships"
echo "  3. prompt-flags-flag-resolution.json — 4-tier flag resolution (clean-academic style)"
echo "  4. prompt-flags-render-pipeline.json — End-to-end render pipeline"
echo ""
echo "To generate, register the MCP server and ask Claude to run create_diagram"
echo "with each JSON spec, or use them as reference for manual diagramming."
echo ""
echo "Output will go to: $DIAGRAMS_DIR/"
