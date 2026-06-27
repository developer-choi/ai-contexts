#!/usr/bin/env node
// 로컬 settings/hooks 생성 계약 검증 (전역 verify-settings-projection.js의 로컬판).
// sync:local-system 시작 시 fail-fast로 호출된다.
const { buildHooks, LOCAL_ADAPTERS, localHookCommand } = require('../settings/settings-projection');
const { loadLocalBaseSettings } = require('./local-deploy-lib');

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

function main() {
  const base = loadLocalBaseSettings();
  const failures = [];
  const check = (cond, msg) => {
    if (cond) console.log(`  PASS  ${msg}`);
    else {
      console.error(`  FAIL  ${msg}`);
      failures.push(msg);
    }
  };

  console.log('로컬 settings 생성 계약 검증 중...');

  check(Array.isArray(base.hooks), 'local base.hooks는 논리 hook 배열');

  const claude = flatten(buildHooks(base.hooks, 'claude', buildOpts));
  const codex = flatten(buildHooks(base.hooks, 'codex', buildOpts));
  const baseFiles = base.hooks.map((h) => h.file);

  // claude: 모든 논리 hook 등록, command가 repo-relative .claude/hooks, PreToolUse 매처 Bash
  check(baseFiles.every((f) => claude.some((h) => h.file === f)), 'claude: base의 모든 hook 등록됨');
  check(claude.every((h) => h.command.includes('.claude/hooks/') && h.command.startsWith('node ')),
    'claude: command가 repo-relative node .claude/hooks/');
  const claudePre = claude.filter((h) => h.event === 'PreToolUse');
  check(claudePre.length > 0 && claudePre.every((h) => h.matcher === 'Bash'), 'claude: PreToolUse 매처 Bash');

  // codex: 모든 논리 hook 등록, command가 .codex/hooks, PreToolUse가 run_command+Bash, UserPromptSubmit 없음
  check(baseFiles.every((f) => codex.some((h) => h.file === f)), 'codex: base의 모든 hook 등록됨');
  check(codex.every((h) => h.command.includes('.codex/hooks/') && h.command.startsWith('node ')),
    'codex: command가 repo-relative node .codex/hooks/');
  const codexPre = codex.filter((h) => h.event === 'PreToolUse');
  check(codexPre.some((h) => h.matcher === 'run_command') && codexPre.some((h) => h.matcher === 'Bash'),
    'codex: PreToolUse가 run_command+Bash로 분리됨');
  check(!codex.some((h) => h.event === 'UserPromptSubmit'), 'codex: UserPromptSubmit 없음');

  if (failures.length > 0) {
    console.error(`\n로컬 settings 생성 계약 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('로컬 settings 생성 계약 정상');
}

main();
