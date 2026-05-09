#!/usr/bin/env bash
# ai-contexts 제거 스크립트
# 배포된 카테고리 폴더를 타겟에서 통째로 제거한다.
# skills는 사용자 보존 스킬 제외 나머지만 제거한다.
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
CATEGORIES="rules contexts agents hooks"
SKILLS_PRESERVE="vercel-composition-patterns vercel-react-best-practices web-design-guidelines"

echo "타겟: $TARGET_DIR"
echo "---"

removed=0

# 카테고리 폴더 통째 제거
for category in $CATEGORIES; do
  target_cat="$TARGET_DIR/$category"
  if [ -d "$target_cat" ]; then
    rm -rf "$target_cat"
    echo "  DEL   $category/"
    removed=$((removed + 1))
  fi
done

# skills: 보존 목록 제외 나머지 제거
skills_target="$TARGET_DIR/skills"
if [ -d "$skills_target" ]; then
  for item in "$skills_target"/*; do
    [ -e "$item" ] || continue
    name="$(basename "$item")"

    preserve=0
    for p in $SKILLS_PRESERVE; do
      if [ "$name" = "$p" ]; then
        preserve=1
        break
      fi
    done

    if [ "$preserve" -eq 0 ]; then
      rm -rf "$item"
      echo "  DEL   skills/$name"
      removed=$((removed + 1))
    fi
  done
fi

# --- deploy/ 루트의 단독 파일 제거 (settings.json, CLAUDE.md 등) ---
# settings.json은 통째 삭제하지 않고 deploy의 top-level 키만 분리한다.
# 사용자 동적 필드(enabledPlugins 등)는 보존.
for file in "$SRC_DIR"/*; do
  [ -f "$file" ] || continue
  file_name="$(basename "$file")"
  target_path="$TARGET_DIR/$file_name"

  if [ "$file_name" = "settings.json" ]; then
    if [ -f "$target_path" ]; then
      node "$SCRIPT_DIR/split-settings.js" "$file" "$target_path"
      echo "  SPLIT $file_name"
      removed=$((removed + 1))
    fi
  elif [ -f "$target_path" ]; then
    rm -f "$target_path"
    echo "  DEL   $file_name"
    removed=$((removed + 1))
  fi
done

echo "---"
echo "완료: ${removed}개 제거"

# --- 글로벌 git alias 제거 (git wt-add) ---
echo ""
echo "---"
echo "git wt-add alias 제거 중..."
git config --global --unset alias.wt-add 2>/dev/null || true
echo "  OK   git wt-add 제거 완료"
