#!/usr/bin/env bash
# ai-contexts 배포 스크립트 (복사 방식)
# deploy/ 안의 rules, skills, contexts를 타겟에 그대로 복사한다.
#
# 사용법:
#   ./scripts/update.sh [target]
#
# 예시:
#   ./scripts/update.sh ~/.claude

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

if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: 소스 디렉토리를 찾을 수 없습니다: $SRC_DIR" >&2
  exit 1
fi

echo "소스: $SRC_DIR"
echo "타겟: $TARGET_DIR"
echo "---"

# 기존 배포 파일 제거 (잔존 파일 방지)
echo "기존 파일 제거 중..."
"$SCRIPT_DIR/uninstall.sh" "$TARGET_DIR"
echo ""

copied=0

for category in $CATEGORIES; do
  src_cat="$SRC_DIR/$category"
  [ -d "$src_cat" ] || continue

  target_cat="$TARGET_DIR/$category"
  mkdir -p "$target_cat"

  for item in "$src_cat"/*; do
    [ -e "$item" ] || continue
    item_name="$(basename "$item")"

    cp -r "$item" "$target_cat/$item_name"
    echo "  COPY  $category/$item_name"
    copied=$((copied + 1))
  done
done

echo "---"
echo "복사 완료: ${copied}개"
echo ""

# --- settings.json 병합 ---
SETTINGS_SRC="$SRC_DIR/settings.json"
SETTINGS_TARGET="$TARGET_DIR/settings.json"

if [ -f "$SETTINGS_SRC" ]; then
  if [ -f "$SETTINGS_TARGET" ]; then
    echo "settings.json 병합 중..."
    node -e "
      const fs = require('fs');
      const [targetPath, sourcePath] = process.argv.slice(1);
      const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      function merge(t, s) {
        for (const [key, value] of Object.entries(s)) {
          if (Array.isArray(value) && Array.isArray(t[key])) {
            t[key] = [...new Set([...t[key], ...value])];
          } else if (value && typeof value === 'object' && !Array.isArray(value) && t[key] && typeof t[key] === 'object') {
            merge(t[key], value);
          } else {
            t[key] = value;
          }
        }
      }
      merge(target, source);
      fs.writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n');
    " "$SETTINGS_TARGET" "$SETTINGS_SRC"
    echo "  MERGE  settings.json"
  else
    cp "$SETTINGS_SRC" "$SETTINGS_TARGET"
    echo "  COPY   settings.json"
  fi
fi

# --- OpenCode commands 자동 생성 ---
OPENCODE_CMD_DIR="$HOME/.config/opencode/commands"
skills_src="$SRC_DIR/skills"

if [ -d "$skills_src" ]; then
  mkdir -p "$OPENCODE_CMD_DIR"
  oc_generated=0

  for skill_dir in "$skills_src"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_md="$skill_dir/SKILL.md"
    [ -f "$skill_md" ] || continue

    # 디렉토리명에서 name, frontmatter에서 description 파싱
    skill_name=$(basename "$skill_dir")
    skill_desc=$(sed -n 's/^description: *//p' "$skill_md" | tr -d '\r' | head -1)

    [ -z "$skill_name" ] && continue
    [ -z "$skill_desc" ] && continue

    cmd_file="$OPENCODE_CMD_DIR/$skill_name.md"
    cat > "$cmd_file" <<EOF
---
description: $skill_desc
---

Read the file $TARGET_DIR/skills/$skill_name/SKILL.md and follow its instructions with the following context: \$ARGUMENTS
EOF
    echo "  GENCMD  opencode/commands/$skill_name.md"
    oc_generated=$((oc_generated + 1))
  done

  echo "OpenCode commands 생성: ${oc_generated}개"
  echo ""
fi

# --- 검증 ---
echo "검증 중..."
failed=0

for category in $CATEGORIES; do
  src_cat="$SRC_DIR/$category"
  [ -d "$src_cat" ] || continue

  target_cat="$TARGET_DIR/$category"

  for item in "$src_cat"/*; do
    [ -e "$item" ] || continue
    item_name="$(basename "$item")"
    target_path="$target_cat/$item_name"

    if [ ! -e "$target_path" ]; then
      echo "  FAIL  $category/$item_name 존재하지 않음"
      failed=$((failed + 1))
    elif diff -rq "$item" "$target_path" > /dev/null 2>&1; then
      echo "  PASS  $category/$item_name"
    else
      echo "  FAIL  $category/$item_name 내용 불일치"
      failed=$((failed + 1))
    fi
  done
done

echo "---"
if [ "$failed" -eq 0 ]; then
  echo "검증 완료: 모두 정상"
else
  echo "검증 실패: ${failed}개 항목 확인 필요" >&2
  exit 1
fi
