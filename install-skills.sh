#!/bin/bash
# Install diagrammer portable skills into a target repo's .claude/skills/ directory.
# Does NOT overwrite existing skills — only adds diagrammer-specific ones.
# Skills are prefixed with "diagrammer-" to avoid name collisions.
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

PREFIX="diagrammer-"

echo "Installing diagrammer skills into $SKILLS_DST"

mkdir -p "$SKILLS_DST"

installed=0
skipped=0

for src_dir in "$SKILLS_SRC"/*/; do
  dirname="$(basename "$src_dir")"
  dst_dir="$SKILLS_DST/${PREFIX}${dirname}"

  if [ ! -f "$src_dir/SKILL.md" ]; then
    continue
  fi

  if [ -d "$dst_dir" ] && diff -q "$src_dir/SKILL.md" "$dst_dir/SKILL.md" > /dev/null 2>&1; then
    echo "  ✓ ${PREFIX}${dirname}/ (already up to date)"
    skipped=$((skipped + 1))
  else
    echo "  + ${PREFIX}${dirname}/ (installed)"
    mkdir -p "$dst_dir"
    cp -R "$src_dir"/* "$dst_dir/"
    installed=$((installed + 1))
  fi
done

echo ""
echo "Done: $installed installed/updated, $skipped already current"
echo ""
echo "Available skills (start a new Claude session to pick them up):"
for src_dir in "$SKILLS_SRC"/*/; do
  dirname="$(basename "$src_dir")"
  echo "  /${PREFIX}${dirname}"
done
echo ""
echo "Make sure the MCP server is registered:"
echo "  claude mcp add --transport stdio --scope user diagrammer -- node $SCRIPT_DIR/dist/index.js"
