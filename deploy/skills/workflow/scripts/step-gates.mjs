#!/usr/bin/env node
// step 점검들 — 산출물 존재, `it.todo` 커버리지, 테스트 이름 대조 이후 변경.
//
// 셋 다 산문이 "센다"·"확인한다"·"돌 때마다"라 적어놓고 세는 주체가 사람이었다.
// 점검을 아예 안 돈 세션과 돌아서 0건인 세션은 산출물상 구분되지 않는다.
//
// 사용:
//   node <이 파일> artifacts --plan <plan 루트> --mode <채용|실무|개인>
//   node <이 파일> todo-coverage (plan | impl) … — 인자는 `todo-coverage`만 부르면 사용 안내가 알린다
//   node <이 파일> name-check record --repo <레포 경로> --base <기준 ref> --table <대조 표 파일>
//   node <이 파일> name-check verify --repo <레포 경로>
//
// 걸린 것이 있으면 exit 1.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [command, ...rest] = process.argv.slice(2);
const optOf = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

const problems = [];
const exists = (p) => fs.existsSync(p);
const nonEmptyDir = (p) => exists(p) && fs.statSync(p).isDirectory() && fs.readdirSync(p).length > 0;

// ── artifacts: requirement 「자료 받기」 산출물 존재 검사 ──────────────────────────────────────────
// 「원본 저장 + 디자인 원본 + 컨벤션 인덱스가 다 나왔는가」. 전부 리터럴 경로이고
// 모드 분기도 닫혀 있다. 하나를 안 만들고 넘어가도 requirement의 요구사항 리뷰는 그대로 굴러가고, MARKUP이
// 디자인 원본·인덱스를 못 찾는 시점에야 드러난다 — 그 시차가 이 검사를 코드로 내리는 이유다.
function artifacts() {
  const plan = optOf('plan');
  const mode = optOf('mode');
  if (!plan || !mode) {
    console.error('artifacts 에는 --plan 과 --mode 가 필요합니다.');
    process.exit(1);
  }
  if (!['채용', '실무', '개인'].includes(mode)) {
    console.error(`--mode 는 채용·실무·개인 중 하나입니다 (받은 값: ${mode}).`);
    process.exit(1);
  }
  const bg = path.join(plan, 'background');
  const required = [
    { label: '컨벤션 인덱스', p: path.join(bg, 'retained', 'conventions-index.md') },
  ];
  if (mode === '채용') {
    required.unshift({ label: '원본 자료', p: path.join(bg, 'persistent'), dir: true });
  }
  // 코드 대용이면 디자인 원본 대신 기존 코드를 읽으므로 figma·시안을 요구하지 않는다.
  const codeTarget = path.join(bg, 'retained', 'code-target.md');
  let figmaUrl;
  if (exists(codeTarget)) {
    required.push({ label: '코드 대용 대상', p: codeTarget });
  } else if (mode === '개인') {
    required.push({ label: '마크업 시안', p: path.join(bg, 'retained', 'mockup'), dir: true });
  } else {
    // figma가 없으면 캡처가 디자인 원본이라 figma URL은 요구하지 않는다. 대신 아래에서 어느 쪽으로 판정됐는지 보여 기록 누락이 눈에 띄게 한다.
    required.push({ label: 'figma 캡처', p: path.join(bg, 'retained', 'figma'), dir: true });
    figmaUrl = exists(path.join(bg, 'retained', 'figma-url.md'));
  }

  console.log(`[requirement 「자료 받기」 산출물 존재 검사] 모드: ${mode}${exists(codeTarget) ? ' (코드 대용 — 디자인 원본은 세지 않는다)' : ''}`);
  for (const r of required) {
    const ok = r.dir ? nonEmptyDir(r.p) : exists(r.p);
    console.log(`  ${ok ? '✓' : '✗'} ${r.label} — ${r.p}`);
    if (!ok) problems.push(`없음: ${r.label}`);
  }
  if (figmaUrl !== undefined) console.log(`  figma: ${figmaUrl ? '있음 (figma 원본 대조)' : '없음 (캡처 대조)'}`);
  // 레포가 아직 없어 인덱스를 미룬 경우는 파일로 판별할 수 없어, 넘어갈지는 사람이 판정한다.
  if (problems.includes('없음: 컨벤션 인덱스')) console.log('\n  (레포가 아직 없어 인덱스를 미뤘으면 컨벤션 인덱스 ✗는 넘어간다 — 「레포 확보」에서 만든다)');
}

// ── todo-coverage: 안내문 + 표 빈 행 + 남은 it.todo ───────────────────────────
// 표를 **채우는** 일(행동 결정 추출)은 의미 판정이라 사람이 한다. 여기서 보는 것은
// 안내문이 첫 줄에 있는지, 채워진 표에 빈 행이 있는지, 테스트 경로에 `it.todo`가 남았는지뿐이다.
// `it.todo` 이름은 PLAN이 고정 문구로 두고 IMPL이 새로 지으므로 문구로 짝을 맞추지 않는다.
const TODO_COVERAGE_USAGE = [
  '사용:',
  '  PLAN 종료: todo-coverage plan --impl <implementation.md> --plan <plan 폴더> [--repo <PR 워크트리>]',
  '  IMPL 종료: todo-coverage impl --impl <implementation.md> [--stub <stub 커밋>] [--repo <PR 워크트리>]',
  '  --repo를 빼면 지금 폴더의 레포로 본다. --stub을 빼면 PLAN 종료 때 기록한 커밋(그때의 마지막 커밋)을 쓴다',
].join('\n');

// 시점을 옵션 유무로 가르면 IMPL 종료에서 --stub을 빠뜨렸을 때 오류 없이 PLAN 모드로 돌아,
// 남은 it.todo·계획 고정 검사를 건너뛰고 고정 기준까지 지금 내용으로 덮어쓴다. 그래서 시점을 하위 명령으로 받는다.
function todoCoverage() {
  const phase = rest[0];
  const impl = optOf('impl');
  const stub = optOf('stub');
  const usageError = (why) => {
    console.error(`${why}\n${TODO_COVERAGE_USAGE}`);
    process.exit(1);
  };
  if (phase !== 'plan' && phase !== 'impl') usageError(`todo-coverage 의 하위 명령은 plan 또는 impl 이다: ${phase ?? '(없음)'}`);
  if (!impl) usageError('todo-coverage 에는 --impl 이 필요하다.');
  if (!exists(impl)) usageError(`implementation.md가 없다: ${impl}`);
  if (phase === 'plan' && stub) usageError('todo-coverage plan 은 --stub 을 받지 않는다 — IMPL 종료면 impl 로 부른다.');
  if (phase === 'plan' && !optOf('plan')) usageError('todo-coverage plan 에는 --plan 이 필요하다 — 이 PR의 base를 prs.json에서 읽는다.');
  const repo = optOf('repo') ?? process.cwd();
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: repo, stdio: 'ignore' });
  } catch {
    console.error(`git 레포가 아니다: ${repo} — PR 워크트리에서 돌리거나 --repo를 준다\n${TODO_COVERAGE_USAGE}`);
    process.exit(1);
  }

  const text = fs.readFileSync(impl, 'utf8');
  coverageTable(text.split('\n'));
  if (phase === 'impl') {
    const record = implFrozen(repo, text);
    const stubRef = stub ?? record?.stub;
    if (stubRef) stubTodos(repo, stubRef);
    else if (record && record.stub === null) console.log('\n[stub 테스트 파일] PLAN 종료 때 stub 커밋이 없었다 — 셀 it.todo 없음');
    else problems.push('stub 커밋을 모른다 — PLAN 종료 기록이 없으니 --stub <stub 커밋>으로 준다');
  } else if (!problems.length) {
    recordImpl(repo, text, optOf('plan'));
  }
}

// implementation.md는 IMPL에 들어간 뒤로는 고치지 않는다 — IMPL 종료 대조의 기준이 계획이라서다.
// PLAN 종료 통과 때의 해시를 워크트리 git 디렉토리에 브랜치와 함께 남기고, IMPL 종료에서 지금 파일과 비교한다.
// stub 커밋도 남긴다 — IMPL 종료가 it.todo를 셀 기준이다. 이 PR의 커밋(prs.json에 기록한 base..HEAD) 중
// stub 흔적을 더한 것이 stub 커밋이다. 다른 브랜치 목록으로 범위를 가리면 백업 브랜치·원격에만 있는 base에서
// 틀려 범위는 base로 정한다. 하나도 없으면 stub 커밋이 없는 PR(설정값만 정하는 SETUP 등)이라 null로 남긴다.
// stub 커밋 뒤에 다른 커밋이 있으면 막는다 — realize-plan은 stub 커밋을 마지막에 둔다.
const STUB_MARK = /not implemented|TODO \[AI_IMPL\]|\bit\.todo\s*\(/;
const implRecordPath = (repo) => path.resolve(repo, git(repo, ['rev-parse', '--git-path', 'workflow-impl-plan.json']).trim());
const hashOf = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

function recordImpl(repo, text, plan) {
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const prsPath = path.join(plan, 'background', 'persistent', 'prs.json');
  const pr = exists(prsPath) ? (JSON.parse(fs.readFileSync(prsPath, 'utf8')).prs ?? []).find((p) => p.branch === branch) : null;
  if (!pr?.base) {
    problems.push(`${branch}의 base가 ${prsPath}에 없다 — steps.mjs pr set으로 이 PR의 브랜치·base를 기록한 뒤 다시 돌린다`);
    return;
  }
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${pr.base}^{commit}`], { cwd: repo, stdio: 'ignore' });
  } catch {
    problems.push(`prs.json에 기록한 base ${pr.base}가 이 레포에 없다 — 원격에만 있으면 받아 오고, 기록이 틀렸으면 steps.mjs pr set으로 고친 뒤 다시 돌린다`);
    return;
  }
  // 아래 PR이 verify에서 stub을 합쳐 다시 써졌으면 base..HEAD에 아래 PR의 옛 stub 커밋이 든다.
  // 이 브랜치가 실제로 갈라진 지점은 base의 reflog로 찾는다(pr branches와 같은 방식). 못 찾으면 base를 쓴다.
  let start = pr.base;
  try {
    start = execFileSync('git', ['merge-base', '--fork-point', pr.base, 'HEAD'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || pr.base;
  } catch {}
  const own = git(repo, ['rev-list', `${start}..HEAD`]).split('\n').filter(Boolean);
  const addsStub = (sha) =>
    git(repo, ['show', '--format=', '-U0', sha])
      .split('\n')
      .some((l) => l.startsWith('+') && !l.startsWith('+++') && STUB_MARK.test(l));
  const stub = own.find(addsStub) ?? null;
  if (stub && stub !== own[0]) {
    const after = own.indexOf(stub);
    problems.push(`stub 커밋(${stub.slice(0, 12)}) 뒤에 커밋이 ${after}개 있다 — stub 커밋을 이 단계의 마지막 커밋으로 옮긴 뒤 다시 돌린다`);
    return;
  }
  fs.writeFileSync(implRecordPath(repo), JSON.stringify({ branch, hash: hashOf(text), stub }, null, 2));
  console.log(
    `\n[implementation.md 기록] ${branch} — PLAN 종료 시점 내용과 ` +
      (stub ? `stub 커밋(${stub.slice(0, 12)})을 남겼다` : `「stub 커밋 없음」을 남겼다(${pr.base}에서 갈라진 뒤의 커밋에 stub 흔적이 없다)`) +
      '. IMPL 종료에서 이것으로 대조한다',
  );
}

function implFrozen(repo, text) {
  const recordPath = implRecordPath(repo);
  const record = exists(recordPath) ? JSON.parse(fs.readFileSync(recordPath, 'utf8')) : null;
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  if (!record || record.branch !== branch) {
    console.log(`\n[implementation.md 고정] ${record ? `기록이 다른 브랜치(${record.branch}) 것이다` : 'PLAN 종료 기록이 없다'} — 계획이 IMPL 중에 바뀌었는지 가릴 수 없다`);
    problems.push('implementation.md의 PLAN 종료 기록이 없다 — 사용자에게 알리고 처리를 정한다');
    return null;
  }
  if (record.hash !== hashOf(text)) {
    console.log('\n[implementation.md 고정] PLAN 종료 뒤 implementation.md가 바뀌었다 — 계획은 IMPL에 들어간 뒤 고치지 않는다');
    problems.push('implementation.md가 PLAN 종료 뒤 바뀌었다 — 고친 것을 되돌리고, 계획을 바꿔야 했으면 사용자에게 올린다');
  }
  return record;
}

function coverageTable(lines) {
  // 안내문이 빠져도 그 자리에선 아무것도 안 깨지고, 문서만 받는 리뷰어가 계획을 고쳐도 되는 파일로 읽는다.
  // 문구의 정본은 [양식](../conventions/artifact/implementation-spec.md#양식)의 코드 블록이다. 사본을 두지 않고 거기서 읽는다.
  const spec = fs.readFileSync(new URL('../conventions/artifact/implementation-spec.md', import.meta.url), 'utf8').split(/\r?\n/);
  const BANNER = spec.slice(spec.findIndex((l) => l.startsWith('## 양식'))).find((l) => l.startsWith('> '));
  if (lines.find((l) => l.trim())?.replace(/^﻿/, '').trim() !== BANNER) {
    console.log(`[안내문] 첫 내용 줄이 아래 안내문이 아니다 — 제목 헤딩보다도 앞에 둔다\n  ${BANNER}`);
    problems.push('implementation.md 첫 줄이 안내문이 아니다');
  }

  // 다른 절의 표까지 읽으면 커버리지 표를 빠뜨려도 통과한다. 「행동 결정 커버리지」 헤딩부터 다음 헤딩 전까지만 읽는다.
  const start = lines.findIndex((l) => /^#+\s.*행동 결정 커버리지/.test(l));
  const end = lines.findIndex((l, i) => start >= 0 && i > start && /^#+\s/.test(l));
  const section = start < 0 ? [] : lines.slice(start + 1, end < 0 ? undefined : end);
  const tableRows = section
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  // 헤더는 구분선 앞 행이다. 첫 칸 글자로 거르면 「행동 결정 없음」 행까지 헤더로 빠진다.
  const sep = tableRows.findIndex((c) => /^:?-{2,}:?$/.test(c[0].replace(/\s/g, '')));
  const rows = tableRows.slice(sep + 1).filter((c) => c.length >= 3);

  if (!rows.length) {
    console.log('[행동 결정 커버리지] 「행동 결정 커버리지」 절에 표 행이 없다 — 표 미산출은 PLAN 종료 금지 사유다. 행동 결정이 하나도 없으면 「행동 결정 없음」 행 하나에 면제 사유를 적는다');
    problems.push('행동 결정 커버리지 표가 없다');
    return;
  }

  const empty = rows.filter((c) => !c[1] && !c[2]);
  console.log(`[행동 결정 커버리지] ${rows.length}행 중 커버·면제가 모두 빈 행 ${empty.length}건`);
  empty.forEach((c) => console.log(`  ${c[0]}`));
  if (empty.length) problems.push('커버 it.todo도 면제 사유도 없는 행이 있다 — PLAN 종료 금지');
}

// stub 커밋이 it.todo를 넣은 테스트 파일을 그 커밋 diff에서 뽑는다. implementation.md 목록은 출처로 쓰지 않는다 —
// 커버리지 표에 안 걸린 it.todo와, 커밋 항목에 안 적히는 기존 테스트 파일에 넣은 it.todo가 빠진다.
function stubTodos(repo, stub) {
  const top = git(repo, ['rev-parse', '--show-toplevel']).trim();
  git(top, ['rev-parse', '--verify', '--quiet', `${stub}^{commit}`]);
  const count = (src, re) => (src.match(re) ?? []).length;
  // `diff stub^ stub`는 stub이 루트 커밋이면 부모가 없어 실패한다. show는 루트 커밋도 다룬다.
  const stubFiles = git(top, ['show', '--name-only', '-z', '--format=', '--diff-filter=AM', stub])
    .split('\0')
    .filter((f) => TEST_FILE.test(f) && count(git(top, ['show', `${stub}:${f}`]), TODO_CALL));
  console.log(`\n[stub 테스트 파일] stub 커밋이 it.todo를 넣은 파일 ${stubFiles.length}개`);
  stubFiles.forEach((f) => console.log(`  ${f}`));

  // 남은 수만 세면 it.todo를 채우지 않고 지워도 0건이라 통과한다. it.todo 이름은 PLAN이 고정 문구로
  // 두어 짝을 맞출 수 없으니, stub 커밋의 it.todo + 기존 it 수만큼 지금 it이 있는지로 본다.
  let stubTodo = 0;
  let stubIt = 0;
  let nowIt = 0;
  let left = 0;
  for (const f of stubFiles) {
    const before = git(top, ['show', `${stub}:${f}`]);
    stubTodo += count(before, TODO_CALL);
    stubIt += count(before, IT_CALL);
    const now = path.join(top, f);
    if (!exists(now)) continue;
    const src = fs.readFileSync(now, 'utf8');
    nowIt += count(src, IT_CALL);
    left += count(src, TODO_CALL);
  }
  console.log(`[남은 it.todo] ${left}건`);
  if (left) problems.push('실제 it(...)로 바꾸지 않은 it.todo가 남았다 — IMPL 종료 금지');
  console.log(`[stub 대비] stub 커밋의 it.todo ${stubTodo}건 + 기존 it ${stubIt}건 → 지금 it ${nowIt}건 + 남은 it.todo ${left}건`);
  if (nowIt + left < stubTodo + stubIt) problems.push('it(...)로 채우지 않고 지운 it.todo가 있다 — IMPL 종료 금지');
}
const TODO_CALL = /\bit\.todo\s*\(/g;
const IT_CALL = /\b(?:it|test)(?:\.only|\.skip)?\s*\(/g;

// ── name-check: verify 테스트 이름 대조 뒤 이름이 바뀌었는가 ─────────────────────
// 문서가 "6.2가 수렴할 때마다(다시 돈 수렴 포함) 대조한다"고 적어놓고, 다시 돈 수렴 뒤
// 대조 없이 사용자 리뷰로 넘어간 세션이 있었다. 대조를 마친 시점의 이름을 record로 남기고,
// 사용자 리뷰 안내 직전에 verify가 지금 이름과 비교한다.
//
// 이름은 감싼 `describe` 경로를 붙인 `describe`·`it`·`test` 첫 인자의 원문 글자다(`f() > 가`).
// 템플릿·`each` 이름을 펼쳐 규칙에 대보는 일은 대조 서브에이전트가 하고, 여기서는
// 「대조 뒤 새로 생긴 이름이 있는가」만 본다. 같은 경로가 두 번 나오면 두 건으로 센다.
// 사용자 리뷰 대상은 커밋이므로 이름은 HEAD 커밋 내용에서 뽑는다.
// 기록은 워크트리별 git 디렉토리에 두고 브랜치 이름을 함께 남긴다 — 다른 PR의 기록으로 통과하지 않게.
const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?|(^|\/)__tests__\/.*\.[cm]?[jt]sx?)$/;
const TEST_FN = ['describe', 'it', 'test'];

function git(repo, args) {
  try {
    return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    const lines = `${e.stderr || e.message}`.trim().split('\n');
    console.error(`git ${args[0]} 실패: ${lines.find((l) => l.startsWith('fatal:')) ?? lines.pop()}`);
    process.exit(1);
  }
}

// 따옴표·템플릿 리터럴 끝 다음 위치. 템플릿 안 `${…}`는 코드로 보고 중첩을 따라간다.
function skipString(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j += 1) {
    if (src[j] === '\\') j += 1;
    else if (src[j] === q) return j + 1;
    else if (q === '`' && src[j] === '$' && src[j + 1] === '{') j = skipCode(src, j + 2, '}') - 1;
  }
  return src.length;
}

// 주석이면 그 끝 다음 위치, 아니면 -1.
function skipComment(src, i) {
  if (src[i] !== '/') return -1;
  if (src[i + 1] === '/') {
    const end = src.indexOf('\n', i);
    return end < 0 ? src.length : end;
  }
  if (src[i + 1] === '*') {
    const end = src.indexOf('*/', i + 2);
    return end < 0 ? src.length : end + 2;
  }
  return -1;
}

// 짝이 맞는 닫는 글자(`)`·`}`) 다음 위치. 문자열·주석 안 괄호는 세지 않는다.
function skipCode(src, i, close) {
  const open = close === ')' ? '(' : '{';
  let depth = 1;
  for (let j = i; j < src.length; j += 1) {
    const c = src[j];
    const comment = skipComment(src, j);
    if (comment >= 0) j = comment - 1;
    else if (c === '"' || c === "'" || c === '`') j = skipString(src, j) - 1;
    else if (c === open) depth += 1;
    else if (c === close && (depth -= 1) === 0) return j + 1;
  }
  return src.length;
}

const skipSpace = (src, i) => {
  while (/\s/.test(src[i] ?? '')) i += 1;
  return i;
};

// `describe`·`it`·`test` 호출마다 { fn, name, start, end }. `.each(…)`·`.each\`…\`` 뒤 호출도 따라간다.
function testCalls(src) {
  const calls = [];
  for (let i = 0; i < src.length; i += 1) {
    const comment = skipComment(src, i);
    if (comment >= 0) {
      i = comment - 1;
      continue;
    }
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i) - 1;
      continue;
    }
    const fn = TEST_FN.find((f) => src.startsWith(f, i));
    if (!fn || /[\w$.]/.test(src[i - 1] ?? '') || /[\w$]/.test(src[i + fn.length] ?? '')) continue;

    let j = i + fn.length;
    while (src[j] === '.' && /[\w$]/.test(src[j + 1] ?? '')) {
      j += 1;
      while (/[\w$]/.test(src[j] ?? '')) j += 1;
    }
    j = skipSpace(src, j);
    if (src[j] === '`') j = skipSpace(src, skipString(src, j));
    else if (src[j] === '(' && !/['"`]/.test(src[skipSpace(src, j + 1)] ?? '')) j = skipSpace(src, skipCode(src, j + 1, ')'));
    if (src[j] !== '(') continue;
    const q = skipSpace(src, j + 1);
    if (!/['"`]/.test(src[q] ?? '')) continue;

    const nameEnd = skipString(src, q);
    calls.push({ fn, name: src.slice(q + 1, nameEnd - 1), start: i, end: skipCode(src, j + 1, ')') });
  }
  return calls;
}

// 바뀐 테스트 파일의 이름을 { key: 'describe 경로 > 이름', at: '파일:줄' }로.
function testNames(repo, base) {
  const files = git(repo, ['diff', '--name-only', '-z', '--diff-filter=d', base, 'HEAD'])
    .split('\0')
    .filter((f) => TEST_FILE.test(f));
  const names = [];
  for (const file of files) {
    const src = git(repo, ['show', `HEAD:${file}`]);
    const calls = testCalls(src);
    for (const call of calls) {
      const scope = calls.filter((d) => d.fn === 'describe' && d.start < call.start && call.start < d.end);
      const key = [...scope.map((d) => d.name), call.name].join(' > ');
      names.push({ key, at: `${file}:${src.slice(0, call.start).split('\n').length}` });
    }
  }
  return names;
}

const countOf = (keys) => keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());

function nameCheck() {
  const sub = rest[0];
  const repo = optOf('repo') ?? process.cwd();
  const recordPath = path.resolve(repo, git(repo, ['rev-parse', '--git-path', 'workflow-name-check.json']).trim());
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();

  if (sub === 'record') {
    const base = optOf('base');
    const table = optOf('table');
    if (!base || !table) {
      console.error('name-check record 에는 --base 와 --table 이 필요합니다.');
      process.exit(1);
    }
    if (!exists(table)) {
      console.error(`대조 표 파일이 없다: ${table}`);
      process.exit(1);
    }
    // 기준 ref가 나중에 움직여도(fetch 등) 같은 범위를 보게 갈라진 지점 SHA로 남긴다.
    const forkPoint = git(repo, ['merge-base', base, 'HEAD']).trim();
    const names = testNames(repo, forkPoint);
    fs.writeFileSync(
      recordPath,
      JSON.stringify({ branch, base: forkPoint, names: names.map((n) => n.key), table: fs.readFileSync(table, 'utf8') }, null, 2),
    );
    console.log(`[테스트 이름 대조 기록] ${branch} — describe·it·test 이름 ${names.length}건을 기록했다 — ${recordPath}`);
    return;
  }

  if (sub === 'verify') {
    const record = exists(recordPath) ? JSON.parse(fs.readFileSync(recordPath, 'utf8')) : null;
    if (!record || record.branch !== branch) {
      console.log(
        record
          ? `[테스트 이름 대조 확인] 기록이 다른 브랜치(${record.branch}) 것이다 — 이 브랜치에서 테스트 이름 대조를 돌리고 record로 남긴다`
          : '[테스트 이름 대조 확인] 기록이 없다 — 테스트 이름 대조를 돌리고 record로 남긴다',
      );
      problems.push('이 브랜치의 테스트 이름 대조 기록이 없다');
      return;
    }
    const left = countOf(record.names);
    const fresh = testNames(repo, record.base).filter((n) => {
      const k = left.get(n.key) ?? 0;
      left.set(n.key, k - 1);
      return k <= 0;
    });
    if (fresh.length) {
      console.log(`[테스트 이름 대조 확인] 대조 뒤 새로 생기거나 바뀐 이름 ${fresh.length}건`);
      fresh.forEach((n) => console.log(`  ${n.key} — ${n.at}`));
      problems.push('대조 뒤 테스트 이름이 바뀌었다 — 테스트 이름 대조를 다시 돈다');
      return;
    }
    console.log('[테스트 이름 대조 확인] 대조 뒤 바뀐 이름 없음. 기록한 대조 표:\n');
    console.log(record.table.trimEnd());
    return;
  }

  console.error(`name-check 의 하위 명령은 record 또는 verify 입니다: ${sub ?? '(없음)'}`);
  process.exit(1);
}

if (command === 'artifacts') artifacts();
else if (command === 'todo-coverage') todoCoverage();
else if (command === 'name-check') nameCheck();
else {
  console.error(`모르는 명령: ${command ?? '(없음)'}`);
  process.exit(1);
}

if (problems.length) {
  console.error(`\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
