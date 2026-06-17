#!/usr/bin/env node
// AC 로컬 배포 제거(전역 unsync:system의 로컬판). sync:local-system이 만든 산출물을 되돌린다:
//   1) 로컬 자산: .claude/<X>·.agents/<X>는 카테고리 통째 제거(gitignore 산출물, orphan 포함),
//      AGENTS.md·GEMINI.md는 CLAUDE.md 있는 레포에서만 제거
//   2) AC settings/hooks: .claude/settings.json은 AC 키만 부분 제거(사용자 키 보존),
//      .codex/hooks.json·.codex/hooks·.claude/hooks는 AC 전유라 통째 제거, .ac-keys 정리
const { unsyncLocalSkills } = require('./unsync-local-skills');
const { uninstallLocal } = require('./local-deploy-lib');

function main() {
  // 1) 로컬 스킬 (cross-repo).
  unsyncLocalSkills();

  // 2) AC settings/hooks.
  console.log('');
  console.log('AC 로컬 settings/hooks 제거 중...');
  console.log('---');
  const removed = uninstallLocal(console.log);
  console.log(`\n제거 완료: ${removed}건`);
}

main();
