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

  // 파일 존재 정합 (deploy/hooks/ ↔ base-settings.json 등록)
  // base 안에서의 투영만 검사하면 파일시스템과 어긋나도 못 잡는다:
  //   - deploy/hooks/에 hook 본체를 추가하고 등록을 빠뜨림 → 죽은 채 배포
  //   - base에 등록된 file을 deploy/hooks/에서 개명·삭제 → 없는 파일 가리키는 command 생성
  // hook 본체 = 폴더 내 다른 .js가 require하지 않는 .js. require되는 것(hook-utils 등)은 라이브러리라 제외.
  // (allowlist를 두지 않는다 — 그 자체가 손-관리 짝꿍이 되어 강등 취지에 어긋난다.)
  const hooksDir = path.join(__dirname, '..', 'deploy', 'hooks');
  const jsFiles = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.js'));
  const imported = new Set();
  for (const f of jsFiles) {
    const src = fs.readFileSync(path.join(hooksDir, f), 'utf8');
    for (const m of src.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)) {
      imported.add(m[1].endsWith('.js') ? m[1] : `${m[1]}.js`);
    }
  }
  const hookBodies = jsFiles.filter((f) => !imported.has(f));
  const registered = new Set(baseFiles);
  const orphans = hookBodies.filter((f) => !registered.has(f));
  const dangling = baseFiles.filter((f) => !jsFiles.includes(f));
  check(orphans.length === 0, `존재 정합: 모든 hook 본체가 base에 등록됨 (미등록: ${orphans.join(', ') || '없음'})`);
  check(dangling.length === 0, `존재 정합: base의 모든 등록이 deploy/hooks/에 실존 (없는 파일: ${dangling.join(', ') || '없음'})`);

  // claude: 모든 논리 hook 등록, command 토큰 .claude
  check(baseFiles.every((f) => claude.some((h) => h.file === f)), 'claude: base의 모든 hook 등록됨');
  check(buildHooks(base.hooks, 'claude').PostToolUse !== undefined
    && JSON.stringify(buildHooks(base.hooks, 'claude')).includes("'.claude','hooks'"), 'claude: command dir 토큰 .claude');

  // claude: UserPromptSubmit 존재(매처 없는 그룹), PreToolUse는 Bash/SendMessage 분리
  check(claude.some((h) => h.event === 'UserPromptSubmit' && h.matcher === null), 'claude: UserPromptSubmit(매처 없음) 존재');
  const claudePre = claude.filter((h) => h.event === 'PreToolUse');
  check(claudePre.some((h) => h.matcher === 'Bash') && claudePre.some((h) => h.matcher === 'SendMessage'),
    'claude: PreToolUse가 Bash/SendMessage로 분리됨');

  // search(on) 항목은 배열 매처 fan-out으로 Glob·Grep 양쪽에 등록된다
  check(claudePre.some((h) => h.matcher === 'Glob' && h.file === 'surface-claude-md.js')
    && claudePre.some((h) => h.matcher === 'Grep' && h.file === 'surface-claude-md.js'),
    'claude: surface-claude-md가 Glob·Grep 매처로 fan-out 등록됨');

  // edit(on) 항목은 배열 매처 fan-out으로 Edit·Write 양쪽에 등록된다
  check(claudePre.some((h) => h.matcher === 'Edit' && h.file === 'surface-coupling.js')
    && claudePre.some((h) => h.matcher === 'Write' && h.file === 'surface-coupling.js'),
    'claude: surface-coupling가 Edit·Write 매처로 fan-out 등록됨');

  // rm 정책은 Bash·PowerShell 양쪽 매처에 등록된다(PowerShell tool은 Bash와 별개)
  check(claudePre.some((h) => h.matcher === 'Bash' && h.file === 'check-rm-policy.js')
    && claudePre.some((h) => h.matcher === 'PowerShell' && h.file === 'check-rm-policy.js'),
    'claude: check-rm-policy가 Bash·PowerShell 매처로 등록됨');

  // claude: PreCompact가 manual·auto 매처로 fan-out 등록됨 (compaction 트리거가 곧 매처)
  const claudeCompact = claude.filter((h) => h.event === 'PreCompact');
  check(claudeCompact.some((h) => h.matcher === 'manual' && h.file === 'snapshot-precompact-transcript.js')
    && claudeCompact.some((h) => h.matcher === 'auto' && h.file === 'snapshot-precompact-transcript.js'),
    'claude: PreCompact가 manual·auto 매처로 등록됨');

  // codex: UserPromptSubmit 없음, PreToolUse 전부 단일 '*'
  check(!codex.some((h) => h.event === 'UserPromptSubmit'), 'codex: UserPromptSubmit 없음');
  const codexPre = codex.filter((h) => h.event === 'PreToolUse');
  check(codexPre.length > 0 && codexPre.every((h) => h.matcher === '*'), 'codex: PreToolUse 전부 단일 * 매처');
  check(JSON.stringify(buildHooks(base.hooks, 'codex')).includes("'.codex','hooks'"), 'codex: command dir 토큰 .codex');
  // codex는 UserPromptSubmit 이벤트 hook(surface-backlog), EnterWorktree 전용 hook
  // (codex엔 그 tool이 없음), PreCompact hook(codex엔 compaction hook 없음)만 빠지고
  // 나머지는 전부 등록
  const codexExcluded = base.hooks
    .filter((h) => h.event === 'UserPromptSubmit' || h.event === 'PreCompact' || h.on === 'enterworktree')
    .map((h) => h.file);
  check(baseFiles.filter((f) => !codexExcluded.includes(f)).every((f) => codex.some((h) => h.file === f)),
    'codex: UserPromptSubmit·EnterWorktree 외 모든 hook 등록됨');
  check(!codex.some((h) => h.file === 'post-enterworktree-install.js'),
    'codex: EnterWorktree 전용 hook 미등록');
  check(!codex.some((h) => h.event === 'PreCompact'),
    'codex: PreCompact hook 미등록');
  // codex엔 PowerShell tool이 없다. powershell 항목은 '*'로 통합되는 bash 항목과 중복되지
  // 않도록 제외되어, check-rm-policy는 정확히 1번만 등록된다.
  check(codex.filter((h) => h.file === 'check-rm-policy.js').length === 1,
    'codex: check-rm-policy 중복 없이 1회 등록됨');

  if (failures.length) {
    console.error(`settings 생성 계약 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('settings 생성 계약 정상');
}

if (require.main === module) main();

module.exports = { flatten };
