#!/usr/bin/env node
// step 파일 frontmatter(step·session·next …)를 모아 후속 안내·세션 첫 step·흐름도를 낸다.
//
// 이 파일이 존재하는 이유: 세션의 진입 조건·후속·권장 모델이 SKILL.md 표 두 개에 모여 있어서
// 모든 세션이 자기 행 하나를 쓰려고 표 전체를 읽었고, step 파일이 표를 다시 적어 중복이 생겼다.
// 정본을 각 step의 frontmatter로 내리고, 모아 보는 일은 이 스크립트가 한다.
//
// 판단은 안 한다 — 진입 조건(`entry`)·조건(`when`)은 산문이라 그대로 찍고, 충족 판정은 부르는 쪽이 한다.
//
// 사용:
//   node <이 파일> next <step>          → 그 step 뒤의 후속(같은 세션 이어서 / spawn / 게이트 해제 안내)
//   node <이 파일> start <세션>         → 세션의 첫 step 파일·step 순서·진입 조건·권장 모델 (PR_3_IMPL도 받는다)
//   node <이 파일> graph                → mermaid 흐름도 초안(stdout). README 흐름도는 이걸 바탕으로 사람이 다듬어 둔다
//   node <이 파일> check                → `on` 값 ↔ 헤딩 대응
//
// frontmatter는 YAML 부분집합만 읽는다(아래 parseFrontmatter). 밖의 문법이면 추측하지 않고 exit 1.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEPS_DIR = path.join(SKILL_DIR, 'steps');

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

// 게이트 해제 안내가 spawn보다 우선한다. realize-plan → plan처럼 세션 틀(PR_{N}_PLAN)이 같아도
// 대상은 다른 PR의 인스턴스이고, 그 세션을 띄우는 것은 BG의 PR 확정이지 이 전이가 아니다.
function kindOf(from, edge, steps) {
  if (edge.notice === 'gate') return 'gate';
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

// 세션의 step 순서 — 첫 step에서 같은 세션 non-gate 간선을 따라간다.
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

// `on` 간선은 세션 도중 사건이라 그때 부르고 세션은 이어진다 — 세션 종료 안내를 따라 하지 않게 적는다.
// 사건은 여러 번(PR 확정)일 수도 한 번(realize-plan 커밋)일 수도 있어 횟수는 적지 않는다.
function describe(edge) {
  const parts = [edge.on ? `세션 도중 사건: ${edge.on} (사건이 일어나면 — 세션은 계속)` : 'step 종료 시점'];
  if (edge.when) parts.push(`조건: ${edge.when}`);
  return parts.join(' / ');
}

function cmdNext(name) {
  const steps = load();
  const from = steps.get(name);
  if (!from) fail(`모르는 step: ${name} (${[...steps.keys()].join(', ')})`);
  const groups = { same: [], spawn: [], gate: [] };
  for (const edge of from.next) {
    target(steps, edge, from);
    groups[kindOf(from, edge, steps)].push(edge);
  }
  console.log(`[${from.step}] 세션 ${from.session}`);
  if (!groups.same.length) {
    console.log('step 종료 시: 세션 종료 (/pre-exit 안내 — step 본문이 이어서 할 일을 정하면 그 뒤)');
  }

  if (groups.same.length) {
    console.log('같은 세션에서 이어서:');
    for (const e of groups.same) console.log(`  → ${e.to} (${rel(steps.get(e.to).file)}) — ${describe(e)}`);
  }
  if (groups.spawn.length) {
    console.log('새 세션 spawn:');
    for (const e of groups.spawn) {
      const t = steps.get(e.to);
      const head = firstStepOf(steps, t.session) ?? t;
      const keep = head.scope === 'project' ? ' (이미 떠 있으면 그 세션에서 이어서)' : '';
      console.log(`  → ${e.to} · 세션 ${t.session}${keep} — ${describe(e)}`);
      console.log(`    진입 조건: ${head.entry ?? '(없음)'}`);
      console.log(`    권장 모델: ${head.model ?? '(없음)'}`);
      console.log(`    호출: /workflow ${t.session} <모드>`);
    }
  }
  if (groups.gate.length) {
    console.log('게이트 해제 안내 (spawn 아님):');
    for (const e of groups.gate) console.log(`  → ${e.to} — ${describe(e)}`);
  }
}

function cmdStart(raw) {
  const steps = load();
  const session = normalizeSession(raw);
  const chain = chainOf(steps, session);
  if (!chain.length) {
    const known = [...new Set([...steps.values()].map((s) => s.session))];
    fail(`모르는 세션: ${raw} (${known.join(', ')})`);
  }
  const [head] = chain;
  console.log(`${session}${head.scope ? ` — scope: ${head.scope}` : ''}`);
  console.log(`첫 step: ${head.step} → ${rel(head.file)}`);
  console.log(`이 세션의 step: ${chain.map((s) => s.step).join(' → ')}`);
  console.log(`진입 조건: ${head.entry}`);
  console.log(`권장 모델: ${head.model ?? '(없음)'}`);
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
      const label = [e.notice === 'gate' ? '게이트 해제' : '', e.on ? `on: ${e.on}` : '', when ? `when: ${when}` : '']
        .filter(Boolean)
        .join(' · ')
        .replace(/"/g, "'");
      const arrow = e.notice === 'gate' ? '-.->' : '-->';
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

const [command, arg] = process.argv.slice(2);
const extra = process.argv.slice(4);
if (command === 'next' && arg && !extra.length) cmdNext(arg);
else if (command === 'start' && arg && !extra.length) cmdStart(arg);
else if (command === 'graph' && arg === undefined) console.log(graph());
else if (command === 'check' && arg === undefined) cmdCheck();
else fail('사용: node <이 파일> (next <step> | start <세션> | graph | check)');
