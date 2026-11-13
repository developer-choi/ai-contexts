#!/usr/bin/env node
// plugin `ac`의 hook 등록(plugins/ac/hooks/hooks.json)과 sync가 만드는 settings 재료의 계약을 회귀 검증한다.
//
// hooks.json은 손으로 고치는 정본이다. 매처 하나를 잘못 적으면 그 hook은 등록된 모습 그대로 한 번도
// 발동하지 않으므로(조용한 무력화), 등록 결과의 핵심 불변식을 기계로 확인한다. sync:system 시작 시
// fail-fast로 돈다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoDir = path.join(import.meta.dirname, '..', '..');
const hooksDir = path.join(repoDir, 'plugins', 'ac', 'hooks');
const hooksJson = path.join(hooksDir, 'hooks.json');
const COMMAND = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([^"/]+\.mjs)"$/;

function flatten(hooksObj) {
  // event별 그룹 → [{event, matcher, file, command}] 평탄화 (file은 command에서 추출)
  const out = [];
  for (const event of Object.keys(hooksObj)) {
    for (const group of hooksObj[event]) {
      for (const h of group.hooks) {
        const m = h.command.match(COMMAND);
        out.push({ event, matcher: 'matcher' in group ? group.matcher : null, file: m && m[1], command: h.command });
      }
    }
  }
  return out;
}

// Claude Code 매처 판정: 영문·숫자·`_`·`|`만이면 정확한 이름(또는 `|` 목록) 비교, 그 밖은 정규식.
function matchesTool(matcher, tool) {
  if (matcher === null || matcher === '' || matcher === '*') return true;
  if (/^[\w|]+$/.test(matcher)) return matcher.split('|').includes(tool);
  return new RegExp(`^(?:${matcher})$`).test(tool);
}

function main() {
  if (!fs.existsSync(hooksJson)) {
    console.error(`hooks.json 없음: ${hooksJson}`);
    process.exit(1);
  }
  const registered = flatten(JSON.parse(fs.readFileSync(hooksJson, 'utf8')).hooks ?? {});
  const failures = [];
  const check = (cond, msg) => {
    if (cond) console.log(`  PASS  ${msg}`);
    else { console.error(`  FAIL  ${msg}`); failures.push(msg); }
  };
  const on = (file, event, tool) => registered.some((h) => h.file === file && h.event === event
    && (tool === undefined ? h.matcher === null : h.matcher !== null && matchesTool(h.matcher, tool)));

  console.log('hook 등록·settings 재료 계약 검증 중...');

  const badCommands = registered.filter((h) => !h.file).map((h) => h.command);
  check(registered.length > 0 && badCommands.length === 0,
    `hooks.json의 모든 command가 node "\${CLAUDE_PLUGIN_ROOT}/hooks/<파일>.mjs" 꼴 (어긋남: ${badCommands.join(' / ') || '없음'})`);

  // 파일 존재 정합 (plugins/ac/hooks/ ↔ hooks.json 등록)
  //   - plugins/ac/hooks/에 hook 본체를 추가하고 등록을 빠뜨림 → 죽은 채 남음
  //   - 등록된 file을 개명·삭제 → 없는 파일을 부르는 command
  // hook 본체 = 폴더 내 다른 .mjs가 import하지 않는 .mjs. import되는 것(hook-utils 등)은 라이브러리라 제외.
  // (allowlist를 두지 않는다 — 그 자체가 손-관리 짝꿍이 되어 강등 취지에 어긋난다.)
  const hookFiles = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.mjs'));
  const imported = new Set();
  for (const f of hookFiles) {
    const src = fs.readFileSync(path.join(hooksDir, f), 'utf8');
    for (const m of src.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)) imported.add(m[1]);
  }
  // ask()는 readPayload()가 기억해 둔 페이로드로 서브에이전트를 가른다. stdin을 직접 파싱하는 훅이
  // ask()를 부르면 서브에이전트에게도 승인 창이 나간다.
  const askWithoutPayload = hookFiles.filter((f) => {
    const m = fs.readFileSync(path.join(hooksDir, f), 'utf8').match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/hook-utils\.mjs['"]/);
    return m && /\bask\b/.test(m[1]) && !/\breadPayload\b/.test(m[1]);
  });
  check(askWithoutPayload.length === 0,
    `ask()를 부르는 훅은 readPayload()로 페이로드를 읽음 (어긋남: ${askWithoutPayload.join(', ') || '없음'})`);
  const registeredFiles = new Set(registered.map((h) => h.file).filter(Boolean));
  const orphans = hookFiles.filter((f) => !imported.has(f) && !registeredFiles.has(f));
  const dangling = [...registeredFiles].filter((f) => !hookFiles.includes(f));
  check(orphans.length === 0, `존재 정합: 모든 hook 본체가 hooks.json에 등록됨 (미등록: ${orphans.join(', ') || '없음'})`);
  check(dangling.length === 0, `존재 정합: hooks.json의 모든 등록이 plugins/ac/hooks/에 실존 (없는 파일: ${dangling.join(', ') || '없음'})`);

  check(registered.some((h) => h.event === 'UserPromptSubmit' && h.matcher === null), 'UserPromptSubmit(매처 없음) 존재');

  // 탐색·쓰기 네 도구 전부에 걸린다(쓰기는 대상이 cwd 안이면 훅이 건너뛰고 밖일 때만 알린다 —
  // 다른 레포의 CLAUDE.md는 Write/Edit으로 로드되지 않는다).
  check(['Glob', 'Grep', 'Edit', 'Write'].every((t) => on('surface-claude-md.mjs', 'PreToolUse', t)),
    'surface-claude-md가 Glob·Grep·Edit·Write에 걸림');
  check(['Edit', 'Write'].every((t) => on('surface-coupling.mjs', 'PreToolUse', t)), 'surface-coupling이 Edit·Write에 걸림');

  // 셸 명령을 실행하는 tool 전부에 걸린다. 하나라도 빠지면 그 tool로 우회한 명령이 정책 검사를 통과한다.
  check(['Bash', 'PowerShell', 'Monitor'].every((t) => on('check-git-push-policy.mjs', 'PreToolUse', t)),
    'check-git-push-policy가 Bash·PowerShell·Monitor에 걸림');
  check(!on('check-git-push-policy.mjs', 'PreToolUse', 'Read'), 'check-git-push-policy가 셸 아닌 도구(Read)에는 안 걸림');

  // 브라우저 훅의 매처는 정규식이어야 한다. 특수문자 없는 문자열은 통짜 비교라 어느 도구와도
  // 안 맞아, 훅이 등록된 모습 그대로 한 번도 발동하지 않는다. 쓰기 도구가 하나라도 빠지면 그 도구로
  // 우회한 클릭·입력이 검사를 통과한다. browser_batch는 다른 도구를 담는 그릇이라 특히 빠지기 쉽다.
  const writeTools = ['computer', 'form_input', 'javascript_tool', 'file_upload', 'upload_image', 'shortcuts_execute', 'browser_batch'];
  check(writeTools.every((t) => on('check-browser-write-policy.mjs', 'PreToolUse', `mcp__claude-in-chrome__${t}`)),
    'check-browser-write-policy가 페이지 쓰기 도구 전부에 걸림');
  check(!on('check-browser-write-policy.mjs', 'PreToolUse', 'mcp__claude-in-chrome__read_page'),
    'check-browser-write-policy가 읽기 도구(read_page)에는 안 걸림');
  // 연결 끊김 에러는 정상 응답으로 온다. PostToolUseFailure로 옮기면 한 번도 안 불린다.
  for (const f of ['record-browser-tab-url.mjs', 'hint-browser-disconnect.mjs']) {
    check(on(f, 'PostToolUse', 'mcp__claude-in-chrome__read_page') && on(f, 'PostToolUse', 'mcp__claude-in-chrome__navigate'),
      `${f}가 PostToolUse에서 claude-in-chrome 도구 전체에 걸림`);
  }

  // 회사 분석 훅은 Agent에 걸려야 검사할 입력(prompt·name)을 본다. code-review 호출자 훅은 Skill에 걸려야 스킬 이름을 본다.
  check(on('check-company-analysis-agent.mjs', 'PreToolUse', 'Agent'), 'check-company-analysis-agent가 Agent에 걸림');
  check(on('check-code-review-caller.mjs', 'PreToolUse', 'Skill'), 'check-code-review-caller가 Skill에 걸림');

  // 턴마다 불려야 하는 훅은 matcher 없는 Stop으로 건다.
  check(on('check-response-language.mjs', 'Stop'), 'check-response-language가 matcher 없는 Stop으로 등록됨');
  check(on('check-table-render.mjs', 'Stop'), 'check-table-render가 matcher 없는 Stop으로 등록됨');

  check(on('surface-skill-creator.mjs', 'PostToolUse', 'Read'), 'surface-skill-creator가 PostToolUse Read에 걸림');
  // 서브에이전트 감시기는 Agent를 띄운 직후에도 살아 있어야 한다.
  check(on('surface-subagent-status.mjs', 'PostToolUse', 'Agent'), 'surface-subagent-status가 PostToolUse Agent에 걸림');

  // sync가 settings.json에 합치는 재료(deploy/*settings.json).
  const deployDir = path.join(repoDir, 'deploy');
  for (const f of fs.readdirSync(deployDir).filter((n) => n.endsWith('settings.json'))) {
    const settings = JSON.parse(fs.readFileSync(path.join(deployDir, f), 'utf8'));
    // permissions.ask는 호출자를 가르지 못해 서브에이전트에게도 승인 창을 낸다. 서브에이전트를 가르는
    // 훅의 ask()(hook-utils.mjs)로 옮긴다.
    const asks = settings.permissions?.ask ?? [];
    check(asks.length === 0,
      `${f}: permissions.ask 없음${asks.length ? ` (${asks.join(', ')}) — ask 규칙은 서브에이전트를 멈추게 한다. 훅의 ask()로 옮겨라` : ''}`);
    // settings.json에 hook을 두면 plugin이 꺼져도 남아, 같은 hook이 두 번 돌거나 hooks.json과 어긋난다.
    check(!('hooks' in settings), `${f}: hooks 키 없음 — hook은 plugins/ac/hooks/hooks.json에 등록하고 본체를 plugins/ac/hooks/의 .mjs로 둔다`);
  }

  if (failures.length) {
    console.error(`hook 등록·settings 재료 계약 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('hook 등록·settings 재료 계약 정상');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { flatten };
