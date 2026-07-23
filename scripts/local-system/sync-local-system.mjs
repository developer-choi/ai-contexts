#!/usr/bin/env node
// 로컬 배포(전역 sync:system의 로컬판). 한 명령으로 로컬 산출물 전부를 배포한다:
//   1) 로컬 자산(스킬 등): 각 레포 local/<X> → .claude/<X>·.agents/<X> (claude·codex 공통),
//      CLAUDE.md → AGENTS.md·GEMINI.md. hooks는 2)가 따로 투영하므로 제외.
//   2) settings/hooks: base-settings를 가진 각 레포의 local/ 소스 → 그 레포의 repo-local
//      .claude/settings.json·.codex/hooks.json (AC + KA 등 per-repo).
//
// settings/hooks는 전역 sync:system과 동일한 메커니즘(부분키 머지·생성 계약 fail-fast·배포
// 후 대조)을 repo-local로 적용한다. 산출물은 gitignore되며, 사용자만
// `! npm run sync:local-system`으로 실행한다(에이전트는 block-ac-sync 훅에 막힘).
import path from 'node:path';
import childProcess from 'node:child_process';

import { ensureHooksReady } from '../lib/hook-guard.mjs';
import { repoDir } from '../lib/deploy-lib.mjs';
import { syncLocalSkills } from './sync-local-skills.mjs';
import { hasLocalSettings, listLocalRepos, projectRepoLocalSettings } from './local-deploy-lib.mjs';

async function main() {
  ensureHooksReady();

  // 생성 계약이 깨지면 배포 전에 중단(fail-fast).
  childProcess.execFileSync(process.execPath, [path.join(import.meta.dirname, 'verify-local-system.mjs')], { stdio: 'inherit' });

  // 1) 로컬 스킬 (cross-repo). hooksReady는 위에서 이미 확인했으므로 생략.
  console.log('');
  syncLocalSkills({ ensureHooks: false });

  // 2) settings/hooks (per-repo). AC 먼저, 그다음 base-settings를 가진 다른 레포(KA 등).
  const failures = [];
  const repos = [repoDir, ...listLocalRepos().filter((repo) => repo !== repoDir && hasLocalSettings(repo))];
  for (const repo of repos) {
    console.log('');
    console.log(`로컬 settings/hooks 배포 중: ${repo}`);
    console.log('---');
    const repoFailures = await projectRepoLocalSettings(repo, { log: console.log, trust: true });
    failures.push(...repoFailures);
  }

  if (failures.length > 0) {
    console.error(`\n배포 검증 실패: ${failures.length}건`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\n로컬 배포 완료 (스킬 + settings/hooks)');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
