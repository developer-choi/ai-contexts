#!/usr/bin/env node
// step 게이트 넷 — 산출물 존재, 리뷰 엔진 우회 조건, `it.todo` 커버리지, 테스트 이름 대조 이후 변경.
//
// 넷 다 산문이 "센다"·"확인한다"·"기계 판정"·"돌 때마다"라 적어놓고 세는 주체가 사람이었다.
// 게이트를 아예 안 돈 세션과 돌아서 0건인 세션은 산출물상 구분되지 않는다.
//
// 사용:
//   node <이 파일> artifacts --plan <plan 루트> --mode <채용|실무|개인>
//   node <이 파일> review-bypass --repo <레포 경로> --base <기준 ref>
//   node <이 파일> todo-coverage --impl <implementation.md> [--tests <경로>]
//   node <이 파일> name-check record --repo <레포 경로> --base <기준 ref> --table <대조 표 파일>
//   node <이 파일> name-check verify --repo <레포 경로>
//
// 걸린 것이 있으면 exit 1.

import { execFileSync } from 'node:child_process';
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

// ── artifacts: requirement 「자료 받기」 종료 게이트 ──────────────────────────────────────────
// 「원본 저장 + 시각 원본 + design-root + 컨벤션 인덱스가 다 나왔는가」. 전부 리터럴 경로이고
// 모드 분기도 닫혀 있다. 하나를 안 만들고 넘어가도 requirement 「requirement-review 본체」는 그대로 굴러가고, MARKUP이
// 진입 문서를 못 찾는 시점에야 드러난다 — 그 시차가 이 게이트를 코드로 내리는 이유다.
function artifacts() {
  const plan = optOf('plan');
  const mode = optOf('mode');
  if (!plan || !mode) {
    console.error('artifacts 에는 --plan 과 --mode 가 필요합니다.');
    process.exit(1);
  }
  const bg = path.join(plan, 'background');
  const required = [
    { label: '시각 원본 진입 문서', p: path.join(bg, 'retained', 'design-root.md') },
    { label: '컨벤션 인덱스', p: path.join(bg, 'retained', 'conventions-index.md') },
  ];
  if (mode === '채용') {
    required.unshift({ label: '원본 자료', p: path.join(bg, 'persistent'), dir: true });
  }
  if (mode === '개인') {
    required.push({ label: '마크업 시안', p: path.join(bg, 'retained', 'mockup'), dir: true });
  } else {
    required.push({ label: 'figma URL', p: path.join(bg, 'retained', 'figma-url.md') });
    required.push({ label: 'figma 캡처', p: path.join(bg, 'retained', 'figma'), dir: true });
  }

  console.log(`[requirement 「자료 받기」 종료 게이트] 모드: ${mode}`);
  for (const r of required) {
    const ok = r.dir ? nonEmptyDir(r.p) : exists(r.p);
    console.log(`  ${ok ? '✓' : '✗'} ${r.label} — ${r.p}`);
    if (!ok) problems.push(`${r.label}가 없다`);
  }
  // 레포가 아직 없어 인덱스를 미룬 경우는 파일로 판별할 수 없어, 넘어갈지는 사람이 판정한다.
  if (problems.length) console.log('\n  (레포 미확보로 인덱스를 미룬 경우라면 연기 사실을 한 줄로 남기고 넘어간다)');
}

// ── review-bypass: impl-review-loop 우회 조건 ────────────────────────────────
// 문서가 "둘 다 **기계 판정** — 런타임 의견 금지"라 못박아 놓고 판정 수단이 없었다.
// 이 스위치는 리뷰 엔진을 통째로 끄는 것이고, 느슨한 쪽으로 틀리면 생략됐다는 사실조차 안 남는다.
//
// 판정 못 한 것은 통과가 아니라 **엔진 강제**로 낸다 — 문서가 정한 fails-safe다.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1; // `**/`는 0개 디렉토리도 매칭한다
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') re += '(';
    else if (c === '}') re += ')';
    else if (c === ',') re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function readJson(p) {
  if (!exists(p)) return null;
  try {
    // tsconfig는 주석을 허용한다. 값 안의 `//`(URL 등)를 안 건드리게 줄 끝 주석만 지운다.
    return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  } catch {
    return null;
  }
}

function reviewBypass() {
  const repo = optOf('repo') ?? process.cwd();
  const base = optOf('base');
  if (!base) {
    console.error('review-bypass 에는 --base 가 필요합니다.');
    process.exit(1);
  }

  let changed;
  try {
    changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: repo, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    console.error(`git diff 실패: ${`${e.stderr || e.message}`.trim().split('\n').pop()}`);
    process.exit(1);
  }

  const pkg = readJson(path.join(repo, 'package.json'));
  const rc = readJson(path.join(repo, '.lintstagedrc.json')) ?? readJson(path.join(repo, '.lintstagedrc'));
  const lintStaged = Object.keys(rc ?? pkg?.['lint-staged'] ?? {});
  const tsconfig = readJson(path.join(repo, 'tsconfig.json'));

  // 판정 재료가 없으면 스코프를 모른다 — 모르는 것은 「스코프 안」이 아니다.
  if (!lintStaged.length && !tsconfig) {
    console.log('[우회 조건 ②] 판정 불가 — lint-staged·tsconfig 어느 쪽도 못 읽었다');
    console.log('  → 엔진 강제 (fails-safe). 스코프를 모르는 것은 스코프 안이 아니다.');
    problems.push('검사 도구 스코프를 판정할 수 없다');
    return;
  }
  if (tsconfig?.extends) {
    console.log(`[주의] tsconfig가 "${tsconfig.extends}"를 extends 한다 — 상속된 include/exclude는 안 따라간다`);
  }

  const lintRes = lintStaged.map(globToRegExp);
  const include = (tsconfig?.include ?? (tsconfig ? ['**/*'] : [])).map(globToRegExp);
  const exclude = (tsconfig?.exclude ?? ['node_modules']).map(globToRegExp);
  const inScope = (f) =>
    lintRes.some((re) => re.test(f) || re.test(path.basename(f))) ||
    (include.some((re) => re.test(f)) && !exclude.some((re) => re.test(f)));

  const outside = changed.filter((f) => !inScope(f));
  console.log(`[우회 조건 ②] 변경 ${changed.length}건 중 스코프 밖 ${outside.length}건`);
  outside.forEach((f) => console.log(`  ${f}`));
  if (outside.length) problems.push('변경 파일 중 자동 검사 스코프 밖이 있다 — 엔진 강제');
  console.log('\n  조건 ①(진실원천 아티팩트 선언 여부)은 계획 문서를 봐야 하므로 여기서 안 본다.');
}

// ── todo-coverage: 표 빈 행 + 남은 it.todo ────────────────────────────────────
// 표를 **채우는** 일(행동 결정 추출)은 의미 판정이라 사람 몫이다. 여기서 세는 것은
// 채워진 표에 빈 행이 있는지와, 테스트 경로에 `it.todo`가 남았는지뿐이다.
// `it.todo` 이름은 PLAN이 고정 문구로 두고 IMPL이 새로 지으므로 문구로 짝을 맞추지 않는다.
function todoCoverage() {
  const impl = optOf('impl');
  const tests = optOf('tests');
  if (!impl) {
    console.error('todo-coverage 에는 --impl 이 필요합니다.');
    process.exit(1);
  }

  const lines = fs.readFileSync(impl, 'utf8').split('\n');
  const rows = lines
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length >= 3 && !/^-{2,}$/.test(c[0].replace(/\s/g, '')) && !c[0].startsWith('행동 결정'));

  if (!rows.length) {
    console.log('[행동 결정 커버리지] 표가 없다 — 표 미산출은 PLAN 종료 금지 사유다');
    problems.push('행동 결정 커버리지 표가 없다');
    return;
  }

  const empty = rows.filter((c) => !c[1] && !c[2]);
  console.log(`[행동 결정 커버리지] ${rows.length}행 중 커버·면제가 모두 빈 행 ${empty.length}건`);
  empty.forEach((c) => console.log(`  ${c[0]}`));
  if (empty.length) problems.push('커버 it.todo도 면제 사유도 없는 행이 있다 — PLAN 종료 금지');

  if (!tests) return;
  const files = fs.statSync(tests).isDirectory()
    ? fs.readdirSync(tests, { recursive: true }).map((f) => path.join(tests, f))
    : [tests];
  const source = files
    .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile() && /\.(test|spec)\.[jt]sx?$/.test(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

  const left = (source.match(/\bit\.todo\s*\(/g) ?? []).length;
  console.log(`\n[남은 it.todo] ${left}건`);
  if (left) problems.push('실제 it(...)로 바꾸지 않은 it.todo가 남았다 — IMPL 종료 금지');
}

// ── name-check: verify 테스트 이름 대조 뒤 이름이 바뀌었는가 ─────────────────────
// 문서가 "6.2가 수렴할 때마다(다시 돈 수렴 포함) 대조한다"고 적어놓고, 다시 돈 수렴 뒤
// 대조 없이 사용자 리뷰로 넘어간 세션이 있었다. 대조를 마친 시점의 이름을 record로 남기고,
// 사용자 리뷰 안내 직전에 verify가 지금 이름과 비교한다.
//
// 이름은 감싼 `describe` 경로를 붙인 `describe`·`it`·`test` 첫 인자의 원문 글자다(`f() > 가`).
// 템플릿·`each` 이름을 펼쳐 규칙에 대보는 일은 대조 서브에이전트 몫이고, 여기서는
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
else if (command === 'review-bypass') reviewBypass();
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
