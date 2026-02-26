#!/bin/bash

# ai-contexts/.claude/skills/ → ~/.claude/skills/ 로 배포 (덮어쓰기)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE="$PROJECT_ROOT/.claude/skills"
TARGET="$HOME/.claude/skills"

if [ ! -d "$SOURCE" ]; then
  echo "소스 디렉토리가 없습니다: $SOURCE"
  exit 1
fi

mkdir -p "$TARGET"
cp -r "$SOURCE"/* "$TARGET"/
echo "배포 완료: $SOURCE → $TARGET"
