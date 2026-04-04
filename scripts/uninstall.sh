#!/usr/bin/env bash
# ai-contexts 제거 스크립트
# 타겟 하위에서 deploy/ 소스와 이름이 일치하는 항목을 삭제한다.
#
# 사용법:
#   ./scripts/uninstall.sh [target]
#
# 예시:
#   ./scripts/uninstall.sh ~/.claude

set -euo pipefail

TARGET_ARG="${1:-}"

if [ -z "$TARGET_ARG" ]; then
  read -p "타겟 경로 [$HOME/.claude]: " TARGET_ARG
  TARGET_ARG="${TARGET_ARG:-$HOME/.claude}"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$REPO_DIR/deploy"
TARGET_DIR="$TARGET_ARG"
CATEGORIES="rules skills contexts"

echo "타겟: $TARGET_DIR"
echo "---"

removed=0

for category in $CATEGORIES; do
  src_cat="$SRC_DIR/$category"
  [ -d "$src_cat" ] || continue

  target_cat="$TARGET_DIR/$category"
  [ -d "$target_cat" ] || continue

  for item in "$src_cat"/*; do
    [ -e "$item" ] || continue
    item_name="$(basename "$item")"
    target_path="$target_cat/$item_name"

    [ -e "$target_path" ] || continue
    rm -rf "$target_path"
    echo "  DEL   $category/$item_name"
    removed=$((removed + 1))
  done
done

# --- deploy/ 루트의 단독 파일 제거 (settings.json, CLAUDE.md 등) ---
for file in "$SRC_DIR"/*; do
  [ -f "$file" ] || continue
  file_name="$(basename "$file")"
  target_path="$TARGET_DIR/$file_name"

  if [ -f "$target_path" ]; then
    rm -f "$target_path"
    echo "  DEL   $file_name"
    removed=$((removed + 1))
  fi
done

# --- OpenCode commands 제거 ---
OPENCODE_CMD_DIR="$HOME/.config/opencode/commands"
skills_src="$SRC_DIR/skills"

if [ -d "$skills_src" ] && [ -d "$OPENCODE_CMD_DIR" ]; then
  for skill_dir in "$skills_src"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_md="$skill_dir/SKILL.md"
    [ -f "$skill_md" ] || continue

    skill_name=$(basename "$skill_dir")
    [ -z "$skill_name" ] && continue

    cmd_file="$OPENCODE_CMD_DIR/$skill_name.md"
    if [ -f "$cmd_file" ]; then
      rm -f "$cmd_file"
      echo "  DEL   opencode/commands/$skill_name.md"
      removed=$((removed + 1))
    fi
  done
fi

echo "---"
echo "완료: ${removed}개 제거"
