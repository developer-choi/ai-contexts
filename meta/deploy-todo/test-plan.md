## 심링크 검증 테스트

| # | 테스트 | 비고 |
|---|---|---|
| 1 | 심링크 생성 | `stow --no-folding -t ~ stow-test`. `--no-folding` 필수 — 없으면 폴더째 심링크(tree folding)되어 개인 파일 공존 불가 |
| 2 | rules 로드 (apple→BANANA) | 심링크된 rules 파일이 세션 시작 시 정상 로드됨 |
| 3 | skills 로드 (cherry→DURIAN) | 심링크된 SKILL.md가 스킬 호출 시 정상 로드됨 |
| 4 | rules → supporting files 참조 | rules 파일 안의 마크다운 링크/파일 경로를 Claude Code가 자동으로 따라가지 않음. 비결정적(가끔 따라가기도 함) |
| 5 | skills → supporting files 참조 | SKILL.md 안의 마크다운 링크를 Claude Code가 따라감. 단, 경로는 심링크 위치(`~/.claude/skills/X/`) 기준으로 resolve됨 → supporting files도 `~/.claude/` 안에 심링크해야 함 |
| 6 | 개인 파일 공존 | `--no-folding`으로 해결 가능 (테스트 1에서 확인) |
| 7 | 파일 삭제 후 무효화 | |
| 8 | paths 조건부 로드 | |
