#!/usr/bin/env node
// step 파일 frontmatter(step·session·next …)를 모아 후속 안내·세션 첫 step·흐름도를 낸다.
//
// 이 파일이 존재하는 이유: 세션의 진입 조건·후속·권장 모델이 SKILL.md 표 두 개에 모여 있어서
// 모든 세션이 자기 행 하나를 쓰려고 표 전체를 읽었고, step 파일이 표를 다시 적어 중복이 생겼다.
// 정본을 각 step의 frontmatter로 내리고, 모아 보는 일은 이 스크립트가 한다.
//
// PR 진행 상태는 `/plan/background/persistent/prs.json`에 두고 이 스크립트만 쓴다. `--plan`을 주면
// 그 상태로 가릴 수 있는 조건(의존 PR의 realize 여부, PR 종류)은 판정해 찍고, 가릴 수 없는 진입 조건(`entry`)은
// 「직접 확인」으로 원문을 찍는다. md에 상태를 적고 눈으로 읽던 것을 옮겼다(rules-as-code.md 「md는 사람이 읽기
// 쉬워야 하고, JSON은 스크립트를 위해 만든다」).
//
// 사용:
//   node <이 파일> next <step> [--plan <plan 폴더> [--pr <N>]]
//       → 그 step 뒤의 후속(같은 세션 이어서 / spawn / 출발 알림). `--pr`이 있으면 그 PR의 진행 단계를 먼저 기록한다
//   node <이 파일> start <세션> [--plan <plan 폴더> --pr <N>]
//       → 세션의 첫 step 파일·step 순서·진입 조건·권장 모델 (PR_3_IMPL도 받는다). PR에 종류가 있으면 읽을 종류 문서
//   node <이 파일> pr add --plan <plan 폴더> --name <이름> [--type <종류>] [--deps 1,2]   → PR 확정. 번호를 매겨 출력
//   node <이 파일> pr set --plan <plan 폴더> --n <N> [--name <이름>] [--type <종류>] [--deps 1,2] [--branch <브랜치> --base <ref>]
//   node <이 파일> pr list --plan <plan 폴더>
//   node <이 파일> pr branches --plan <plan 폴더> --repo <레포>
//       → PR마다 형태(스택·독립)·범위 커밋. 스택인데 아래 브랜치 tip이 안 들어 있으면 어긋남으로 exit 1
//   node <이 파일> graph                → mermaid 흐름도 초안(stdout). README 흐름도는 이걸 바탕으로 사람이 다듬어 둔다
//   node <이 파일> check                → `on` 값 ↔ 헤딩 대응
//
// frontmatter는 YAML 부분집합만 읽는다(아래 parseFrontmatter). 밖의 문법이면 추측하지 않고 exit 1.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEPS_DIR = path.join(SKILL_DIR, 'steps');
const PR_TYPES_DIR = path.join(SKILL_DIR, 'conventions', 'pr-types');
const SIDE_SESSION_DOC = path.join(SKILL_DIR, 'conventions', 'side-session.md');

// 진행 단계. 뒤로 가지 않는다. 어느 step이 끝나면 어느 단계로 올리는지.
const STAGES = ['confirmed', 'consumed', 'realized'];
const STAGE_BY_STEP = { plan: 'consumed', 'realize-plan': 'realized' };
const DIRECTIVE = '안내 규칙: 이 출력에 없는 세션은 언급하지 않는다. 「직접 확인」 항목만 판단해 덧붙인다.';
const DIRECTIVE_SESSION_END = '이 step으로 세션을 끝낼 때: 종료 보고의 남은 단계마다 담당 세션을 붙인다.';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

// 지원 문법: `키: 값` 한 줄 / `키: >-` 뒤 들여쓴 줄(공백 하나로 접음) / `next: []` /
// `next:` 뒤 `  - 키: 값`과 더 깊이 들여쓴 `    키: 값`. 값은 첫 `: `에서 나눠 나머지를 글자 그대로 둔다.
function parseFrontmatter(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  const where = (i) => `${path.relative(SKILL_DIR, file).replace(/\\/g, '/')}:${i + 1}`;
  if (end === -1) fail(`지원하지 않는 frontmatter 문법 — 닫는 '---' 없음 (${where(0)})`);

  const data = {};
  let i = 1;
  while (i < end) {
    const line = lines[i];
    if (line.includes('\t')) fail(`지원하지 않는 frontmatter 문법 — 탭 (${where(i)})`);
    const m = line.match(/^([A-Za-z_]+):(?: (.*))?$/);
    if (!m) fail(`지원하지 않는 frontmatter 문법 (${where(i)}): ${line}`);
    const [, key, raw = ''] = m;
    const value = raw.trim();
    i += 1;

    if (key === 'next') {
      if (value === '[]') {
        data.next = [];
        continue;
      }
      if (value) fail(`지원하지 않는 frontmatter 문법 — next는 [] 또는 목록 (${where(i - 1)})`);
      data.next = [];
      while (i < end && lines[i].startsWith(' ')) {
        const item = lines[i].match(/^ {2}- ([A-Za-z_]+): (.+)$/);
        const cont = lines[i].match(/^ {4}([A-Za-z_]+): (.+)$/);
        if (item) data.next.push({ [item[1]]: item[2].trim() });
        else if (cont && data.next.length) data.next.at(-1)[cont[1]] = cont[2].trim();
        else fail(`지원하지 않는 frontmatter 문법 — next 항목 (${where(i)}): ${lines[i]}`);
        i += 1;
      }
      continue;
    }
    if (value === '>-') {
      const folded = [];
      while (i < end && /^ +\S/.test(lines[i])) folded.push(lines[i++].trim());
      if (!folded.length) fail(`지원하지 않는 frontmatter 문법 — 빈 '>-' 블록 (${where(i - 1)})`);
      data[key] = folded.join(' ');
      continue;
    }
    if (!value || /^['"|>]/.test(value)) fail(`지원하지 않는 frontmatter 문법 (${where(i - 1)}): ${line}`);
    data[key] = value;
  }
  return data;
}

function load() {
  const steps = new Map();
  for (const file of walk(STEPS_DIR)) {
    const data = parseFrontmatter(file);
    if (!data) continue; // frontmatter 없는 md는 step이 아니다(모드 파일 등)
    steps.set(data.step, { ...data, next: data.next ?? [], file });
  }
  return steps;
}

const rel = (file) => path.relative(SKILL_DIR, file).replace(/\\/g, '/');

// 세션 이름의 PR 번호는 틀로 되돌린다 — 호출은 `PR_3_IMPL`로 오지만 frontmatter는 `PR_{N}_IMPL`이다.
const normalizeSession = (name) => name.replace(/^PR_\d+_/, 'PR_{N}_');

// 출발 알림이 spawn보다 우선한다. realize-plan → plan처럼 세션 틀(PR_{N}_PLAN)이 같아도
// 대상은 다른 PR의 인스턴스이고, 그 세션을 띄우는 것은 BG의 PR 확정이지 이 전이가 아니다.
function kindOf(from, edge, steps) {
  if (edge.notice === 'go') return 'go';
  return steps.get(edge.to).session === from.session ? 'same' : 'spawn';
}

function target(steps, edge, from) {
  const t = steps.get(edge.to);
  if (!t) fail(`${from.step}의 next.to '${edge.to}' — 그런 step이 없다`);
  return t;
}

function firstStepOf(steps, session) {
  return [...steps.values()].find((s) => s.session === session && s.entry !== undefined);
}

// 세션의 step 순서 — 첫 step에서 같은 세션 non-go 간선을 따라간다.
function chainOf(steps, session) {
  const chain = [];
  let cur = firstStepOf(steps, session);
  while (cur && !chain.includes(cur)) {
    chain.push(cur);
    const nextSame = cur.next.find((e) => kindOf(cur, e, steps) === 'same');
    cur = nextSame ? steps.get(nextSame.to) : undefined;
  }
  return chain;
}

// `on` 간선은 세션 도중 사건이라 그때 부르고 세션은 이어진다.
// 사건은 여러 번(PR 확정)일 수도 한 번(realize-plan 커밋)일 수도 있어 횟수는 적지 않는다.
function describe(edge) {
  const parts = [edge.on ? `세션 도중 사건: ${edge.on} (사건이 일어나면 — 세션은 계속)` : 'step 종료 시점'];
  if (edge.when) parts.push(`조건: ${edge.when}`);
  return parts.join(' / ');
}

// ── PR 진행 상태 (prs.json) ──

const prsFile = (plan) => path.join(plan, 'background', 'persistent', 'prs.json');

function readPrs(plan) {
  // 폴더 오타면 빈 상태로 보고 조용히 넘어가거나 엉뚱한 곳에 prs.json을 만든다 — 폴더는 있어야 한다.
  if (!fs.existsSync(plan) || !fs.statSync(plan).isDirectory()) fail(`--plan 폴더가 없다: ${plan}`);
  const file = prsFile(plan);
  if (!fs.existsSync(file)) return { prs: [] };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`prs.json을 읽을 수 없다 (${file}): ${e.message}`);
  }
  if (!data || !Array.isArray(data.prs)) fail(`prs.json 모양이 아니다 — { "prs": [...] } 이어야 한다 (${file})`);
  return data;
}

function parseNum(raw, flag) {
  if (raw === undefined) fail(`${flag}가 필요하다`);
  if (!/^[1-9]\d*$/.test(raw)) fail(`${flag}는 양의 정수다: '${raw}'`);
  return Number(raw);
}

function writePrs(plan, data) {
  const file = prsFile(plan);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function findPr(data, n) {
  const pr = data.prs.find((p) => p.n === n);
  if (!pr) fail(`prs.json에 PR ${n}이 없다 (${data.prs.map((p) => p.n).join(', ') || '비어 있음'})`);
  return pr;
}

// 파일 목록과 이름이 정확히 같아야 한다 — 존재 여부로 보면 경로가 섞인 값(`../../skill`)도 통과한다.
function parseType(raw) {
  const known = fs
    .readdirSync(PR_TYPES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, '').toUpperCase());
  const type = raw.toUpperCase();
  if (!known.includes(type)) fail(`모르는 PR 종류: ${raw} (${known.join(', ')})`);
  return type;
}

// 빈 값은 "의존 없음"이다. 중복은 하나로 합친다.
function parseDeps(raw, data, self) {
  const deps = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].map((d) => parseNum(d, '--deps'));
  for (const d of deps) {
    if (d === self) fail(`PR ${self}은 자기 자신에 의존할 수 없다`);
    findPr(data, d);
  }
  return deps;
}

// 서로를 기다리면 둘 다 영영 출발하지 못한다.
function assertNoCycle(data, start) {
  const seen = new Set();
  const stack = [...start.deps];
  while (stack.length) {
    const n = stack.pop();
    if (n === start.n) fail(`의존이 돈다 — PR ${start.n}이 결국 자기 자신을 기다린다`);
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...findPr(data, n).deps);
  }
}

const prLabel = (pr) => `PR ${pr.n}. ${pr.name}`;
const isRealized = (data, n) => findPr(data, n).stage === 'realized';
const waitingOn = (data, pr) => pr.deps.filter((d) => !isRealized(data, d));

function cmdPr(sub, opt) {
  if (!opt.plan) fail('pr 명령은 --plan <plan 폴더>가 필요하다');
  const data = readPrs(opt.plan);
  if (sub === 'add') {
    if (!opt.name) fail('pr add는 --name이 필요하다');
    const n = Math.max(0, ...data.prs.map((p) => p.n)) + 1;
    const pr = {
      n,
      name: opt.name,
      type: opt.type ? parseType(opt.type) : null,
      deps: opt.deps ? parseDeps(opt.deps, data, n) : [],
      stage: 'confirmed',
    };
    data.prs.push(pr);
    writePrs(opt.plan, data);
    console.log(`${prLabel(pr)} 확정 (번호 ${n})`);
  } else if (sub === 'set') {
    const pr = findPr(data, parseNum(opt.n, '--n'));
    if (!['name', 'type', 'deps', 'branch', 'base'].some((k) => opt[k] !== undefined)) {
      fail('pr set은 바꿀 값이 필요하다: --name <이름> | --type <종류> | --deps 1,2 | --branch <브랜치> --base <ref>');
    }
    if (opt.name) pr.name = opt.name;
    // 종류·의존은 plan이 이 PR을 가져가기 전에만 바꾼다 — 뒤 step은 가져간 시점의 값으로 이미 진행 중이다.
    if ((opt.type || opt.deps !== undefined) && pr.stage !== 'confirmed') {
      fail(`${prLabel(pr)}은 이미 ${pr.stage} 단계라 종류·의존을 바꿀 수 없다`);
    }
    if (opt.type) pr.type = parseType(opt.type);
    if (opt.deps !== undefined) {
      pr.deps = parseDeps(opt.deps, data, pr.n);
      assertNoCycle(data, pr);
    }
    if ((opt.branch === undefined) !== (opt.base === undefined)) fail('--branch와 --base는 함께 준다');
    if (opt.branch !== undefined) {
      for (const ref of [opt.branch, opt.base]) {
        if (!ref || ref.startsWith('-')) fail(`브랜치·base로 쓸 수 없는 값: '${ref}'`);
      }
      if (opt.branch === opt.base) fail('--branch와 --base가 같다');
      const owner = data.prs.find((other) => other.n !== pr.n && other.branch === opt.branch);
      if (owner) fail(`${opt.branch}는 이미 ${prLabel(owner)}의 브랜치다`);
      pr.branch = opt.branch;
      pr.base = opt.base;
    }
    writePrs(opt.plan, data);
    console.log(`${prLabel(pr)} 갱신`);
  } else if (sub === 'list') {
    if (!data.prs.length) console.log('확정된 PR 없음');
    for (const pr of data.prs) {
      const deps = pr.deps.length ? pr.deps.map((d) => `PR ${d}`).join(', ') : '-';
      const branch = pr.branch ? `${pr.branch} ← ${pr.base}` : '-';
      console.log(`${prLabel(pr)} | 종류: ${pr.type ?? '-'} | 의존: ${deps} | 단계: ${pr.stage} | 브랜치: ${branch}`);
    }
  } else if (sub === 'branches') {
    cmdBranches(data, opt);
  } else {
    fail('사용: pr (add | set | list | branches) --plan <plan 폴더> …');
  }
}

// git이 실패하면 null — 없는 브랜치·조상 아님을 오류가 아니라 판정 결과로 쓴다.
function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function cmdBranches(data, opt) {
  if (!opt.repo) fail('pr branches는 --repo <PR 브랜치가 있는 레포>가 필요하다');
  if (git(opt.repo, ['rev-parse', '--git-dir']) === null) fail(`git 레포가 아니다: ${opt.repo}`);
  if (!data.prs.length) console.log('확정된 PR 없음');
  let broken = 0;
  for (const pr of data.prs) {
    if (!pr.branch) {
      console.log(`${prLabel(pr)} | 브랜치 미기록 — pr set --n ${pr.n} --branch <브랜치> --base <ref>로 기록한다`);
      broken += 1;
      continue;
    }
    const missing = [pr.branch, pr.base].filter((ref) => git(opt.repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) === null);
    if (missing.length) {
      console.log(`${prLabel(pr)} | 레포에 없음: ${missing.join(', ')}`);
      broken += 1;
      continue;
    }
    const below = data.prs.find((other) => other.n !== pr.n && other.branch === pr.base);
    const shape = below ? `스택(PR ${below.n} 위)` : `독립(base ${pr.base})`;
    const log = git(opt.repo, ['log', '--reverse', '--format=%h %s', `${pr.base}..${pr.branch}`]);
    const commits = log ? log.split('\n') : [];
    console.log(`${prLabel(pr)} | ${pr.branch} | ${shape} | 범위 ${pr.base}..${pr.branch} ${commits.length}커밋`);
    commits.forEach((commit) => console.log(`    ${commit}`));
    // 아래 브랜치가 다른 워크트리에 체크아웃돼 있으면 `rebase --update-refs`가 건너뛰어 옛 커밋에 남는데, git은 에러를 내지 않는다.
    if (below && git(opt.repo, ['merge-base', '--is-ancestor', pr.base, pr.branch]) === null) {
      console.log(`  어긋남: ${pr.base}의 tip이 ${pr.branch}에 없다 — 아래 브랜치가 안 따라왔거나 이 브랜치가 옛 base 위에 있다`);
      broken += 1;
    }
    const baseMatchesDeps = below ? pr.deps.includes(below.n) : pr.deps.length === 0;
    if (!baseMatchesDeps) {
      const deps = pr.deps.length ? pr.deps.map((dep) => `PR ${dep}`).join(', ') : '없음';
      console.log(`  직접 확인: 의존(${deps})과 base(${below ? `PR ${below.n}` : pr.base})가 다르다`);
    }
  }
  if (broken) {
    console.log(`[pr branches] 확인할 PR ${broken}건`);
    process.exit(1);
  }
}

// `--pr N`으로 부른 step이 끝낸 단계를 기록한다. 이미 그 단계 이상이면 그대로 둔다.
function recordStage(plan, data, pr, stepName) {
  const to = STAGE_BY_STEP[stepName];
  if (!to || STAGES.indexOf(to) <= STAGES.indexOf(pr.stage)) return;
  pr.stage = to;
  writePrs(plan, data);
  console.log(`기록: ${prLabel(pr)} → ${to}`);
}

// PR 종류로 갈리는 조건만 판정한다 — `종류 FOUNDATION`(이 PR의 종류), `FOUNDATION PR 없음`(확정된 PR 중에).
// 그 밖의 when은 산문이라 그대로 찍는다.
function typeWhenFails(edge, data, pr) {
  const own = edge.when?.match(/^종류 ([A-Z]+)$/);
  if (own) return Boolean(pr && pr.type !== own[1]);
  const none = edge.when?.match(/^([A-Z]+) PR 없음$/);
  if (none) return Boolean(data && data.prs.some((p) => p.type === none[1]));
  return false;
}

// 출발 알림 대상: 아직 plan이 안 가져간 PR 중 이 사건과 관련된 것. 관련 기준은 알림을 내는 step마다 다르다.
function goTargets(fromStep, data, pr) {
  const waiting = data.prs.filter((p) => p.stage === 'confirmed');
  if (fromStep === 'realize-plan') return pr ? waiting.filter((p) => p.deps.includes(pr.n)) : [];
  if (fromStep === 'markup') return waiting.filter((p) => p.type === 'COMPONENTS');
  return waiting;
}

function cmdNext(name, opt) {
  const steps = load();
  const from = steps.get(name);
  if (!from) fail(`모르는 step: ${name} (${[...steps.keys()].join(', ')})`);
  if (opt.pr !== undefined && !opt.plan) fail('--pr은 --plan과 함께 준다');
  const data = opt.plan ? readPrs(opt.plan) : null;
  const pr = opt.pr !== undefined ? findPr(data, parseNum(opt.pr, '--pr')) : null;

  const groups = { same: [], spawn: [], go: [] };
  for (const edge of from.next) {
    target(steps, edge, from);
    if (typeWhenFails(edge, data, pr)) continue;
    groups[kindOf(from, edge, steps)].push(edge);
  }
  console.log(`[${from.step}] 세션 ${from.session}`);
  if (pr) recordStage(opt.plan, data, pr, from.step);

  if (groups.same.length) {
    console.log('같은 세션에서 이어서:');
    for (const e of groups.same) console.log(`  → ${e.to} (${rel(steps.get(e.to).file)}) — ${describe(e)}`);
  }

  const spawnLines = [];
  for (const e of groups.spawn) {
    const t = steps.get(e.to);
    const head = firstStepOf(steps, t.session) ?? t;
    const perPr = t.session.includes('{N}');
    const keep = head.scope === 'project' ? ' (이미 떠 있으면 그 세션에서 이어서)' : '';
    // PR마다 뜨는 세션의 호출문: IMPL 등은 이 PR 번호로. PLAN은 `--pr`(방금 확정한 PR)이 있으면 그것만,
    // 없으면 아직 안 가져간 PR마다 한 줄씩 — PR 확정마다 전부 찍으면 이미 띄운 PLAN을 또 안내한다.
    let calls = [`/workflow ${t.session} <모드>`];
    if (data && perPr && t.session !== 'PR_{N}_PLAN') {
      if (pr) calls = [`/workflow ${t.session.replace('{N}', pr.n)} <모드>`];
    } else if (data && perPr) {
      calls = (pr ? [pr] : data.prs)
        .filter((p) => p.stage === 'confirmed')
        .map((p) => {
          const wait = waitingOn(data, p);
          const call = `/workflow ${t.session.replace('{N}', p.n)} <모드>`;
          return wait.length ? `대기 — ${call} (PR ${wait.join(', ')}의 realize-plan 커밋 전)` : call;
        });
      if (!calls.length) continue;
    }
    spawnLines.push(`  → ${e.to} · 세션 ${t.session}${keep} — ${describe(e)}`);
    spawnLines.push(`    ${data ? '직접 확인' : '진입 조건'}: ${head.entry ?? '(없음)'}`);
    spawnLines.push(`    권장 모델: ${head.model ?? '(없음)'}`);
    for (const c of calls) spawnLines.push(`    호출: ${c}`);
  }
  if (spawnLines.length) {
    console.log('새 세션 spawn:');
    spawnLines.forEach((l) => console.log(l));
  }

  const goLines = [];
  for (const e of groups.go) {
    if (!data) {
      goLines.push(`  → ${e.to} — ${describe(e)}`);
      continue;
    }
    if (from.step === 'realize-plan' && !pr) {
      goLines.push('  (알릴 PR은 --pr <방금 커밋한 PR>을 주면 찍힌다)');
      continue;
    }
    const before = goLines.length;
    for (const p of goTargets(from.step, data, pr)) {
      if (waitingOn(data, p).length) continue;
      goLines.push(`  → ${prLabel(p)} — PR_${p.n}_PLAN 시작 가능 (${describe(e)})`);
      // COMPONENTS PR은 의존과 별개로 MARKUP의 공통 컴포넌트 확정도 기다린다 — 스크립트가 모르는 사건이다.
      if (from.step !== 'markup' && p.type === 'COMPONENTS') goLines.push('    직접 확인: MARKUP 「공통 컴포넌트 확정」 완료');
    }
    // when에 괄호로 붙은 예외(확정 0건이면 …)는 스크립트가 못 가린다.
    const aside = e.when?.match(/\(([^)]*)\)/);
    if (goLines.length > before && aside) goLines.push(`    직접 확인: ${aside[1]}`);
  }
  if (goLines.length) {
    console.log('출발 알림 (새 세션 아님 — 이미 떠서 기다리는 세션에 시작해도 된다고 알린다):');
    goLines.forEach((l) => console.log(l));
  }

  if (data) {
    console.log(DIRECTIVE);
    if (!groups.same.length) console.log(DIRECTIVE_SESSION_END);
  } else {
    // 인자 규칙은 문서가 아니라 여기서 알린다 — 부르는 쪽이 옵션을 몰라도 첫 호출에서 배운다.
    console.log(
      `PR 상태로 판정하려면 다시 부른다: next ${from.step} --plan /plan --pr <N>` +
        ' (N = 이 세션이 맡은 PR. BG의 PR 확정이면 방금 확정한 번호. PR을 맡지 않는 세션은 --pr 생략)',
    );
  }
}

function cmdStart(raw, opt) {
  const steps = load();
  const session = normalizeSession(raw);
  const chain = chainOf(steps, session);
  if (!chain.length) {
    const known = [...new Set([...steps.values()].map((s) => s.session))];
    fail(`모르는 세션: ${raw} (${known.join(', ')})`);
  }
  const [head] = chain;
  // 검증은 출력 전에 — 몇 줄 찍고 실패하면 앞 줄을 믿고 진행할 수 있다.
  if (!fs.existsSync(SIDE_SESSION_DOC)) fail(`별도 세션 정책 문서가 없다: ${rel(SIDE_SESSION_DOC)} — 옮겼으면 SIDE_SESSION_DOC을 고친다`);
  let data = null;
  let pr = null;
  if (opt.pr !== undefined) {
    if (!opt.plan) fail('--pr은 --plan과 함께 준다');
    if (!session.includes('{N}')) fail(`${session}은 PR 하나를 맡는 세션이 아니라 --pr을 받지 않는다`);
    data = readPrs(opt.plan);
    pr = findPr(data, parseNum(opt.pr, '--pr'));
    const named = raw.match(/^PR_(\d+)_/);
    if (named && Number(named[1]) !== pr.n) fail(`세션 이름의 번호(${named[1]})와 --pr(${pr.n})이 다르다`);
  }
  console.log(`${session}${head.scope ? ` — scope: ${head.scope}` : ''}`);
  console.log(`첫 step: ${head.step} → ${rel(head.file)}`);
  console.log(`이 세션의 step: ${chain.map((s) => s.step).join(' → ')}`);
  console.log(`진입 조건: ${head.entry}`);
  console.log(`권장 모델: ${head.model ?? '(없음)'}`);
  // 정책 본문은 side-session.md에 있다. 세션이 그 문서를 안 연 채 방아쇠를 지나치지 않게, 시작 출력에 방아쇠와 경로만 띄운다.
  console.log(
    '별도 세션 제안: 결론만 있으면 되고 과정은 다시 쓰지 않는 작업(결정 하나의 근거로 외부 문서·라이브러리 소스 여러 곳 읽기(직접이든 서브에이전트든), 재현용 앱·페이지 제작, 원인 가설이 2번 틀린 버그의 3번째 가설 등)은' +
      ` 사용자가 시킨 일이어도 그 일을 시작하기 전에 ${rel(SIDE_SESSION_DOC)}의 방아쇠를 보고 별도 세션으로 뺄지 묻는다`,
  );
  if (!pr) {
    if (session.includes('{N}')) console.log(`PR 상태·종류 문서를 보려면 다시 부른다: start ${raw} --plan /plan --pr <N>`);
    return;
  }
  const wait = waitingOn(data, pr);
  if (session === 'PR_{N}_PLAN' && wait.length) {
    console.log(`대기: PR ${wait.join(', ')}의 realize-plan 커밋 전 — 아직 시작하지 않는다`);
  }
  if (pr.type) console.log(`읽을 종류 문서: ${rel(path.join(PR_TYPES_DIR, `${pr.type.toLowerCase()}.md`))}`);
}

// `--키 값` 쌍과 위치 인자를 가른다. 허용하지 않은 키나 값 없는 키는 추측하지 않고 exit 1.
function parseArgs(argv, allowed) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      pos.push(a);
      continue;
    }
    const key = a.slice(2);
    const value = argv[i + 1];
    if (!allowed.includes(key)) fail(`모르는 옵션: ${a} (${allowed.map((k) => `--${k}`).join(' ') || '옵션 없음'})`);
    if (value === undefined || value.startsWith('--')) fail(`${a}에 값이 없다`);
    opt[key] = value;
    i += 1;
  }
  return { pos, opt };
}

// 결정적 순서: 루트(들어오는 간선 없는 step)에서 BFS로 만난 순서.
function orderedSteps(steps) {
  const incoming = new Set([...steps.values()].flatMap((s) => s.next.map((e) => e.to)));
  const queue = [...steps.values()].filter((s) => !incoming.has(s.step));
  const seen = [];
  while (queue.length) {
    const s = queue.shift();
    if (seen.includes(s)) continue;
    seen.push(s);
    for (const e of s.next) queue.push(target(steps, e, s));
  }
  for (const s of steps.values()) if (!seen.includes(s)) seen.push(s);
  return seen;
}

function graph() {
  const steps = load();
  const order = orderedSteps(steps);
  const id = (step) => step.replace(/[^A-Za-z0-9]/g, '_');
  const sessionId = (session) => `s_${session.replace(/[^A-Za-z0-9]/g, '_')}`;
  const out = ['```mermaid', 'flowchart TD'];
  const sessions = [...new Set(order.map((s) => s.session))];
  for (const session of sessions) {
    out.push(`  subgraph ${sessionId(session)} ["${session}"]`);
    for (const s of order.filter((x) => x.session === session)) out.push(`    ${id(s.step)}["${s.step}"]`);
    out.push('  end');
  }
  for (const s of order) {
    for (const e of s.next) {
      const when = e.when?.replace(/\s*\([^)]*\)/g, '');
      const label = [e.notice === 'go' ? '출발 알림' : '', e.on ? `on: ${e.on}` : '', when ? `when: ${when}` : '']
        .filter(Boolean)
        .join(' · ')
        .replace(/"/g, "'");
      const arrow = e.notice === 'go' ? '-.->' : '-->';
      out.push(`  ${id(s.step)} ${arrow}${label ? `|"${label}"|` : ''} ${id(e.to)}`);
    }
  }
  out.push('```');
  return out.join('\n');
}

function cmdCheck() {
  const steps = load();
  const problems = [];

  // `on` 값은 본문에서 그 사건이 일어나는 자리의 이름과 맞아야 한다 — 그 step 파일의 헤딩이 on 값을 포함해야 한다.
  // 한 방향만 본다: 헤딩이 on에 포함되는 것까지 받으면 짧은 헤딩("커밋")이 아무 on이나 통과시킨다.
  for (const s of steps.values()) {
    const headings = fs
      .readFileSync(s.file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^#{1,6}\s/.test(l))
      .map((l) => l.replace(/^#+\s*/, ''));
    for (const e of s.next) {
      if (!e.on) continue;
      const on = e.on.trim();
      if (on.length < 2 || !headings.some((h) => h.includes(on))) {
        problems.push(`${rel(s.file)}: on '${e.on}'에 맞는 헤딩이 없다`);
      }
    }
  }

  console.log(`[steps check] ${problems.length}건`);
  problems.forEach((p) => console.log(`  ${p}`));
  if (problems.length) process.exit(1);
}

const USAGE = '사용: node <이 파일> (next <step> [--plan <p> [--pr <N>]] | start <세션> [--plan <p> --pr <N>] | pr (add|set|list|branches) --plan <p> … | graph | check)';
const [command, ...rest] = process.argv.slice(2);
if (command === 'next' || command === 'start') {
  const { pos, opt } = parseArgs(rest, ['plan', 'pr']);
  if (pos.length !== 1) fail(USAGE);
  if (command === 'next') cmdNext(pos[0], opt);
  else cmdStart(pos[0], opt);
} else if (command === 'pr') {
  const { pos, opt } = parseArgs(rest, ['plan', 'name', 'type', 'deps', 'n', 'branch', 'base', 'repo']);
  if (pos.length !== 1) fail(USAGE);
  cmdPr(pos[0], opt);
} else if (command === 'graph' && !rest.length) console.log(graph());
else if (command === 'check' && !rest.length) cmdCheck();
else fail(USAGE);
