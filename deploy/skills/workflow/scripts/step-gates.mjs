#!/usr/bin/env node
// step 종료 게이트 셋 — 산출물 존재, 리뷰 엔진 우회 조건, `it.todo` 커버리지.
//
// 셋 다 산문이 "센다"·"확인한다"·"기계 판정"이라 적어놓고 세는 주체가 사람이었다.
// 게이트를 아예 안 돈 세션과 돌아서 0건인 세션은 산출물상 구분되지 않는다.
//
// 사용:
//   node <이 파일> artifacts --plan <plan 루트> --mode <채용|실무|개인>
//   node <이 파일> review-bypass --repo <레포 경로> --base <기준 ref>
//   node <이 파일> todo-coverage --impl <implementation.md> [--tests <경로>]
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

// ── artifacts: step-1.1 종료 게이트 ──────────────────────────────────────────
// 「원본 저장 + 시각 원본 + design-root + 컨벤션 인덱스가 다 나왔는가」. 전부 리터럴 경로이고
// 모드 분기도 닫혀 있다. 하나를 안 만들고 넘어가도 step-1.2는 그대로 굴러가고, MARKUP이
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
    { label: '원본 자료', p: path.join(bg, 'persistent'), dir: true },
    { label: '시각 원본 진입 문서', p: path.join(bg, 'retained', 'design-root.md') },
    { label: '컨벤션 인덱스', p: path.join(bg, 'retained', 'conventions-index.md') },
  ];
  if (mode === '개인') {
    required.push({ label: '마크업 시안', p: path.join(bg, 'retained', 'mockup'), dir: true });
  } else {
    required.push({ label: 'figma URL', p: path.join(bg, 'retained', 'figma-url.md') });
    required.push({ label: 'figma 캡처', p: path.join(bg, 'retained', 'figma'), dir: true });
  }

  console.log(`[step-1.1 종료 게이트] 모드: ${mode}`);
  for (const r of required) {
    const ok = r.dir ? nonEmptyDir(r.p) : exists(r.p);
    console.log(`  ${ok ? '✓' : '✗'} ${r.label} — ${r.p}`);
    if (!ok) problems.push(`${r.label}가 없다`);
  }
  // 레포가 아직 없어 인덱스를 미룬 경우는 「연기 사실을 한 줄로 남긴다」가 규칙이라, 그 판정은 사람 몫이다.
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

// ── todo-coverage: 표 빈 행 + it.todo ↔ it(...) ──────────────────────────────
// 표를 **채우는** 일(행동 결정 추출)은 의미 판정이라 사람 몫이다. 여기서 세는 것은
// 채워진 표에 빈 행이 있는지와, 그 `it.todo`가 실제 `it(...)`로 옮겨졌는지뿐이다.
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

  const desc = (re) => [...source.matchAll(re)].map((m) => m[2]);
  const todos = desc(/it\.todo\s*\(\s*(['"`])(.*?)\1/g);
  const written = new Set(desc(/(?<!\.todo)\bit\s*\(\s*(['"`])(.*?)\1/g));
  const missing = todos.filter((t) => !written.has(t));

  console.log(`\n[it.todo ↔ it(...)] todo ${todos.length}건 · 작성 ${written.size}건 · 짝 없는 todo ${missing.length}건`);
  missing.forEach((t) => console.log(`  ${t}`));
  if (missing.length) {
    problems.push('짝이 없는 it.todo가 있다 — 문구만 다듬은 것인지 정말 빠진 것인지는 사람이 가른다');
  }
}

if (command === 'artifacts') artifacts();
else if (command === 'review-bypass') reviewBypass();
else if (command === 'todo-coverage') todoCoverage();
else {
  console.error(`모르는 명령: ${command ?? '(없음)'}`);
  process.exit(1);
}

if (problems.length) {
  console.error(`\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
