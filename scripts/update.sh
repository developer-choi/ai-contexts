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
