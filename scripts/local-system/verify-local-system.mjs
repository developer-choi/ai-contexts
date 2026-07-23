#!/usr/bin/env node
// 로컬 settings/hooks 생성 계약 검증 (전역 verify-settings-projection.js의 로컬판).
// sync:local-system 시작 시 fail-fast로 호출된다. base-settings를 가진 각 레포(AC + KA 등)를
// per-repo로 검증한다. 이벤트별 단언은 해당 이벤트가 있을 때만 적용해, Stop-only base(KA)나
// PreToolUse-only base(AC)가 서로의 단언에 걸리지 않게 한다.
import path from 'node:path';

import { buildHooks, LOCAL_ADAPTERS, localHookCommand } from '../settings/settings-projection.mjs';
import { repoDir } from '../lib/deploy-lib.mjs';
import { hasLocalSettings, listLocalRepos, loadLocalBaseSettings } from './local-deploy-lib.mjs';

const buildOpts = { adapters: LOCAL_ADAPTERS, makeCommand: localHookCommand };

// buildHooks 출력 → [{event, matcher, file}] 평탄화. command가 `node <dir>/hooks/<file>`
// 형식이라 file과 dir 토큰을 거기서 추출한다.
function flatten(hooksObj) {
  const out = [];
  for (const event of Object.keys(hooksObj)) {
    for (const group of hooksObj[event]) {
      for (const h of group.hooks) {
        const m = h.command.match(/\/hooks\/([^\s"/]+)/);
        out.push({ event, matcher: 'matcher' in group ? group.matcher : null, file: m && m[1], command: h.command });
      }
    }
  }
  return out;
}

function verifyBase(base, label, check) {
  check(Array.isArray(base.hooks), `${label}: local base.hooks는 논리 hook 배열`);

  const claude = flatten(buildHooks(base.hooks, 'claude', buildOpts));
  const codex = flatten(buildHooks(base.hooks, 'codex', buildOpts));
  const baseFiles = base.hooks.map((h) => h.file);
  // codex는 지원 이벤트(supports)만 투영된다 — Stop-only base면 빈 집합.
  const codexFiles = base.hooks.filter((h) => LOCAL_ADAPTERS.codex.supports(h.event, h.on)).map((h) => h.file);

  // claude: 모든 논리 hook 등록, command가 repo-relative .claude/hooks
  check(baseFiles.every((f) => claude.some((h) => h.file === f)), `${label} claude: base의 모든 hook 등록됨`);
  check(claude.every((h) => h.command.includes('.claude/hooks/') && h.command.startsWith('node ')),
    `${label} claude: command가 repo-relative node .claude/hooks/`);

  // codex: codex-지원 subset만 등록, command가 repo-relative .codex/hooks, Stop·UserPromptSubmit 없음
  check(codexFiles.every((f) => codex.some((h) => h.file === f)), `${label} codex: codex-지원 hook 등록됨`);
  check(codex.every((h) => h.command.includes('.codex/hooks/') && h.command.startsWith('node ')),
    `${label} codex: command가 repo-relative node .codex/hooks/`);
  check(!codex.some((h) => h.event === 'Stop'), `${label} codex: Stop 없음`);
  check(!codex.some((h) => h.event === 'UserPromptSubmit'), `${label} codex: UserPromptSubmit 없음`);

  // 이벤트별 단언(해당 이벤트가 있을 때만).
  const claudePre = claude.filter((h) => h.event === 'PreToolUse');
  if (claudePre.length > 0) check(claudePre.every((h) => h.matcher === 'Bash'), `${label} claude: PreToolUse 매처 Bash`);
  const codexPre = codex.filter((h) => h.event === 'PreToolUse');
  if (codexPre.length > 0) {
    check(codexPre.some((h) => h.matcher === 'run_command') && codexPre.some((h) => h.matcher === 'Bash'),
      `${label} codex: PreToolUse가 run_command+Bash로 분리됨`);
  }
  const claudeStop = claude.filter((h) => h.event === 'Stop');
  if (claudeStop.length > 0) check(claudeStop.every((h) => h.matcher === null), `${label} claude: Stop 매처 없음`);
}

function main() {
  const failures = [];
  const check = (cond, msg) => {
    if (cond) console.log(`  PASS  ${msg}`);
    else {
      console.error(`  FAIL  ${msg}`);
      failures.push(msg);
    }
  };

  console.log('로컬 settings 생성 계약 검증 중...');

  const repos = [repoDir, ...listLocalRepos().filter((repo) => repo !== repoDir && hasLocalSettings(repo))];
  for (const repo of repos) {
    verifyBase(loadLocalBaseSettings(repo), path.basename(repo), check);
  }

  if (failures.length > 0) {
    console.error(`\n로컬 settings 생성 계약 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('로컬 settings 생성 계약 정상');
}

main();
