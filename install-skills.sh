#!/bin/bash
# Install diagrammer portable skills into a target repo's .claude/skills/ directory.
# Does NOT overwrite existing skills — only adds diagrammer-specific ones.
#
# Usage:
#   ./install-skills.sh /path/to/target/repo
#   ./install-skills.sh   # defaults to current directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/portable-skills"

TARGET="${1:-.}"
TARGET="$(cd "$TARGET" && pwd)"
SKILLS_DST="$TARGET/.claude/skills"

# Prefix all installed skills to avoid collisions
PREFIX="diagrammer-"

echo "Installing diagrammer skills into $SKILLS_DST"

# Create .claude/skills/ if it doesn't exist
mkdir -p "$SKILLS_DST"

installed=0
skipped=0

for src_file in "$SKILLS_SRC"/*.md; do
  filename="$(basename "$src_file")"
  dst_file="$SKILLS_DST/${PREFIX}${filename}"

  if [ -f "$dst_file" ]; then
    # Check if it's the same content (idempotent reinstall)
    if diff -q "$src_file" "$dst_file" > /dev/null 2>&1; then
      echo "  ✓ ${PREFIX}${filename} (already up to date)"
      skipped=$((skipped + 1))
    else
      echo "  ↻ ${PREFIX}${filename} (updated)"
      cp "$src_file" "$dst_file"
      installed=$((installed + 1))
    fi
  else
    echo "  + ${PREFIX}${filename} (installed)"
    cp "$src_file" "$dst_file"
    installed=$((installed + 1))
  fi
done

echo ""
echo "Done: $installed installed/updated, $skipped already current"
echo ""
echo "Available skills:"
for src_file in "$SKILLS_SRC"/*.md; do
  filename="$(basename "$src_file" .md)"
  echo "  /diagrammer-${filename}"
done
echo ""
echo "Make sure the MCP server is registered:"
echo "  claude mcp add --transport stdio --scope user diagrammer -- node $SCRIPT_DIR/dist/index.js"
