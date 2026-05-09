#!/usr/bin/env bash
# ai-contexts 배포 스크립트 (복사 방식)
# deploy/ 안의 카테고리 폴더를 타겟에 통째로 복사한다.
# skills는 사용자 외부 스킬 보존을 위해 항목 단위로 복사한다.
#
# 사용법:
#   ./scripts/update.sh [target]
#
# 예시:
#   ./scripts/update.sh ~/.claude

set -euo pipefail

TARGET_ARG="${1:-$HOME/.claude}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$REPO_DIR/deploy"
TARGET_DIR="$TARGET_ARG"
CATEGORIES="rules contexts agents hooks"

if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: 소스 디렉토리를 찾을 수 없습니다: $SRC_DIR" >&2
  exit 1
fi

echo "소스: $SRC_DIR"
echo "타겟: $TARGET_DIR"
echo "---"

# 기존 배포 제거 (고아 파일 방지)
echo "기존 파일 제거 중..."
"$SCRIPT_DIR/uninstall.sh" "$TARGET_DIR"
echo ""

copied=0

# 카테고리 폴더 통째 복사
for category in $CATEGORIES; do
  src_cat="$SRC_DIR/$category"
  [ -d "$src_cat" ] || continue

  cp -r "$src_cat" "$TARGET_DIR/$category"
  echo "  COPY  $category/"
  copied=$((copied + 1))
done

# skills: 사용자 보존 스킬과 공존해야 하므로 항목별 복사
src_skills="$SRC_DIR/skills"
if [ -d "$src_skills" ]; then
  target_skills="$TARGET_DIR/skills"
  mkdir -p "$target_skills"

  for item in "$src_skills"/*; do
    [ -e "$item" ] || continue
    item_name="$(basename "$item")"
    cp -r "$item" "$target_skills/$item_name"
    echo "  COPY  skills/$item_name"
    copied=$((copied + 1))
  done
fi

echo "---"
echo "복사 완료: ${copied}개"
echo ""

# --- deploy/ 루트의 단독 파일 배포 (settings.json, CLAUDE.md 등) ---
# settings.json은 사용자 동적 필드(enabledPlugins 등) 보존을 위해 얕은 머지.
for file in "$SRC_DIR"/*; do
  [ -f "$file" ] || continue
  file_name="$(basename "$file")"
  target_path="$TARGET_DIR/$file_name"

  if [ "$file_name" = "settings.json" ]; then
    node "$SCRIPT_DIR/merge-settings.js" "$file" "$target_path"
    echo "  MERGE $file_name"
  else
    cp "$file" "$target_path"
    echo "  COPY  $file_name"
  fi
  copied=$((copied + 1))
done

# --- 검증 ---
echo "검증 중..."
failed=0

for category in $CATEGORIES; do
  src_cat="$SRC_DIR/$category"
  [ -d "$src_cat" ] || continue

  target_cat="$TARGET_DIR/$category"

  if [ ! -d "$target_cat" ]; then
    echo "  FAIL  $category/ 존재하지 않음"
    failed=$((failed + 1))
  elif diff -rq "$src_cat" "$target_cat" > /dev/null 2>&1; then
    echo "  PASS  $category/"
  else
    echo "  FAIL  $category/ 내용 불일치"
    failed=$((failed + 1))
  fi
done

if [ -d "$src_skills" ]; then
  for item in "$src_skills"/*; do
    [ -e "$item" ] || continue
    item_name="$(basename "$item")"
    target_path="$TARGET_DIR/skills/$item_name"

    if [ ! -e "$target_path" ]; then
      echo "  FAIL  skills/$item_name 존재하지 않음"
      failed=$((failed + 1))
    elif diff -rq "$item" "$target_path" > /dev/null 2>&1; then
      echo "  PASS  skills/$item_name"
    else
      echo "  FAIL  skills/$item_name 내용 불일치"
      failed=$((failed + 1))
    fi
  done
fi

for file in "$SRC_DIR"/*; do
  [ -f "$file" ] || continue
  file_name="$(basename "$file")"
  target_path="$TARGET_DIR/$file_name"

  if [ ! -f "$target_path" ]; then
    echo "  FAIL  $file_name 존재하지 않음"
    failed=$((failed + 1))
  elif [ "$file_name" = "settings.json" ]; then
    if node "$SCRIPT_DIR/verify-settings.js" "$file" "$target_path"; then
      echo "  PASS  $file_name (merged)"
    else
      echo "  FAIL  $file_name 머지 결과 키 불일치"
      failed=$((failed + 1))
    fi
  elif diff -q "$file" "$target_path" > /dev/null 2>&1; then
    echo "  PASS  $file_name"
  else
    echo "  FAIL  $file_name 내용 불일치"
    failed=$((failed + 1))
  fi
done

echo "---"
if [ "$failed" -eq 0 ]; then
  echo "검증 완료: 모두 정상"
else
  echo "검증 실패: ${failed}개 항목 확인 필요" >&2
  exit 1
fi

# --- 글로벌 git alias 등록 (git wt-add) ---
# 새 worktree 생성 + 의존성 설치(package.json 있을 때 npm ci)를 한 번에.
# 모든 레포에서 동작 (글로벌). 셸 무관 (git이 sh -c로 실행).
echo ""
echo "---"
echo "git wt-add alias 등록 중..."
git config --global alias.wt-add '!f() { branch="$1"; path="$2"; base="${3:-$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed s,^origin/,,)}"; base="${base:-master}"; git worktree add -b "$branch" "$path" "$base" || return $?; if [ -f "$path/package.json" ]; then ( cd "$path" && npm ci ); fi; }; f'
echo "  OK   git wt-add 등록 완료 (사용법: git wt-add <branch> <path> [base])"
