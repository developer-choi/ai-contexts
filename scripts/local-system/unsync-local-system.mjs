#!/usr/bin/env node
// 로컬 배포 제거(전역 unsync:system의 로컬판). sync:local-system이 만든 산출물을 되돌린다:
//   1) 로컬 자산: .claude/<X>·.agents/<X>는 카테고리 통째 제거(gitignore 산출물, orphan 포함),
//      AGENTS.md·GEMINI.md는 CLAUDE.md 있는 레포에서만 제거
//   2) settings/hooks: base-settings를 가진 각 레포에서 .claude/settings.json은 AC 키만
//      부분 제거(사용자 키 보존), .codex/hooks.json·.codex/hooks·.claude/hooks는 통째 제거, .ac-keys 정리
import { unsyncLocalSkills } from './unsync-local-skills.mjs';
import { repoDir } from '../lib/deploy-lib.mjs';
import { hasLocalSettings, listLocalRepos, uninstallLocal } from './local-deploy-lib.mjs';

function main() {
  // 1) 로컬 스킬 (cross-repo).
  unsyncLocalSkills();

  // 2) settings/hooks (per-repo, sync와 동일 대상 집합).
  const repos = [repoDir, ...listLocalRepos().filter((repo) => repo !== repoDir && hasLocalSettings(repo))];
  let removed = 0;
  for (const repo of repos) {
    console.log('');
    console.log(`로컬 settings/hooks 제거 중: ${repo}`);
    console.log('---');
    removed += uninstallLocal(console.log, repo);
  }
  console.log(`\n제거 완료: ${removed}건`);
}

main();
