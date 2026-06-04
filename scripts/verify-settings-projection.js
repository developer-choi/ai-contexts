#!/usr/bin/env node
// settings-projection.js의 생성 계약을 회귀 검증한다.
//
// base-settings.json의 타겟별 소스를 단일화하면서, 타겟 간 hook 구조 차이(런타임 제약)는
// 어댑터가 보존해야 한다. 어댑터를 잘못 건드리면 배포본이 조용히 달라지므로, 생성 결과의
// 핵심 불변식을 기계로 확인한다. sync:system 시작 시 fail-fast로 돌아 깨진 채 배포되는 것을 막는다.

const fs = require('fs');
const path = require('path');

const { buildHooks } = require('./settings-projection');

const baseSettingsSource = path.join(__dirname, '..', 'deploy', 'base-settings.json');

function flatten(hooksObj) {
  // event별 그룹 → [{event, matcher, file}] 평탄화 (file은 command에서 추출)
  const out = [];
  for (const event of Object.keys(hooksObj)) {
    for (const group of hooksObj[event]) {
      for (const h of group.hooks) {
        const m = h.command.match(/'hooks','([^']+)'/);
        out.push({ event, matcher: 'matcher' in group ? group.matcher : null, file: m && m[1] });
      }
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(baseSettingsSource)) {
    console.error(`base-settings.json 없음: ${baseSettingsSource}`);
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(baseSettingsSource, 'utf8'));
  const failures = [];
  const check = (cond, msg) => {
    if (cond) console.log(`  PASS  ${msg}`);
    else { console.error(`  FAIL  ${msg}`); failures.push(msg); }
  };

  console.log('settings 생성 계약 검증 중...');

  check(Array.isArray(base.hooks), 'base.hooks는 논리 hook 배열');

  const claude = flatten(buildHooks(base.hooks, 'claude'));
  const codex = flatten(buildHooks(base.hooks, 'codex'));
  const baseFiles = base.hooks.map((h) => h.file);

  // claude: 모든 논리 hook 등록, command 토큰 .claude
  check(baseFiles.every((f) => claude.some((h) => h.file === f)), 'claude: base의 모든 hook 등록됨');
  check(buildHooks(base.hooks, 'claude').PostToolUse !== undefined
    && JSON.stringify(buildHooks(base.hooks, 'claude')).includes("'.claude','hooks'"), 'claude: command dir 토큰 .claude');

  // claude: UserPromptSubmit 존재(매처 없는 그룹), PreToolUse는 Bash/SendMessage 분리
  check(claude.some((h) => h.event === 'UserPromptSubmit' && h.matcher === null), 'claude: UserPromptSubmit(매처 없음) 존재');
  const claudePre = claude.filter((h) => h.event === 'PreToolUse');
  check(claudePre.some((h) => h.matcher === 'Bash') && claudePre.some((h) => h.matcher === 'SendMessage'),
    'claude: PreToolUse가 Bash/SendMessage로 분리됨');

  // codex: UserPromptSubmit 없음, PreToolUse 전부 단일 '*'
  check(!codex.some((h) => h.event === 'UserPromptSubmit'), 'codex: UserPromptSubmit 없음');
  const codexPre = codex.filter((h) => h.event === 'PreToolUse');
  check(codexPre.length > 0 && codexPre.every((h) => h.matcher === '*'), 'codex: PreToolUse 전부 단일 * 매처');
  check(JSON.stringify(buildHooks(base.hooks, 'codex')).includes("'.codex','hooks'"), 'codex: command dir 토큰 .codex');
  // codex는 prompt 이벤트 hook(surface-backlog)만 빠지고 나머지는 전부 등록
  const promptFiles = base.hooks.filter((h) => h.event === 'UserPromptSubmit').map((h) => h.file);
  check(baseFiles.filter((f) => !promptFiles.includes(f)).every((f) => codex.some((h) => h.file === f)),
    'codex: UserPromptSubmit 외 모든 hook 등록됨');

  if (failures.length) {
    console.error(`settings 생성 계약 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('settings 생성 계약 정상');
}

if (require.main === module) main();

module.exports = { flatten };
