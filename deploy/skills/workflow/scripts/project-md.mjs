#!/usr/bin/env node
// `/plan/background/consumable/project.md`를 읽고 쓴다 — 워크플로우의 PR 인덱스.
//
// 이 파일이 존재하는 이유: project.md는 세션 다섯 곳 이상에서 손으로 편집되고 세 곳에서
// 조회된다. 절 이름·순서·번호·삽입 위치가 전부 산문으로만 정해져 있었고, 읽는 쪽(PLAN 진입,
// FINALIZE 마지막 PR 판정)은 형식이 어긋나면 **아무것도 못 찾은 채 조용히 넘어간다** —
// SKILL.md와 finalize.md가 각각 "PR 절이 없거나 비어 있으면 폴백"을 적어둔 것이 그 증거다.
//
// 조회 쪽도 마찬가지였다. 「누가 나에게 의존하는가」는 세 자리(step-4 base 판단, step-4 stub
// 확정 시 게이트 해제 안내, step-6 의존 PR 게이트)에서 필요한데 부를 수단이 없어 매번
// project.md 전문을 열어 역방향 그래프를 머리로 뒤집었다. 하나를 놓치면 그 PR이 출발
// 가능해진 줄 모른 채 대기하고, 대기 제거가 이 워크플로우의 존재 이유다.
//
// 판단은 안 한다 — 각 절에 무엇을 적을지(의존 문장·범위·TODO 내용)는 부르는 쪽이 정해 넘긴다.
//
// 사용:
//   node <이 파일> <project.md> list
//   node <이 파일> <project.md> add-pr --name "이름" [--dep "..."] [--scope "..."] [--ref "..."] [--todo "..."]
//   node <이 파일> <project.md> dependents --pr N
//   node <이 파일> <project.md> add-todo (--pr N | --unassigned) --item "..."
//
// 반복 가능한 옵션(--dep·--scope·--ref·--todo)은 여러 번 줄 수 있다.

import fs from 'node:fs';

// 네 하위 절은 이 순서로 고정이다. 「어떤 절도 비워두거나 지우지 않는다」이므로 빈 절엔 `- 없음`이 들어간다.
const SUBS = [
  ['의존', 'dep'],
  ['범위', 'scope'],
  ['참고 자료', 'ref'],
  ['TODO', 'todo'],
];
const UNASSIGNED = '미분류';
// 「의존」 항목은 `- PR {번호}. {이름} — {무엇이 있으면 착수 가능한지}` 꼴이다. 번호가 역방향 조회의 키다.
const DEP_REF = /^-\s*PR\s*(\d+)\./;

function parseArgs(argv) {
  const args = { dep: [], scope: [], ref: [], todo: [] };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--name') args.name = argv[++i];
    else if (a === '--pr') args.pr = Number(argv[++i]);
    else if (a === '--item') args.item = argv[++i];
    else if (a === '--unassigned') args.unassigned = true;
    else if (a === '--dep' || a === '--scope' || a === '--ref' || a === '--todo') args[a.slice(2)].push(argv[++i]);
    else rest.push(a);
  }
  args.file = rest[0];
  args.command = rest[1];
  return args;
}

// `## `로 문서를 자른다. 앞머리(첫 `## ` 이전)는 그대로 보존한다.
function parseSections(text) {
  const lines = text.split('\n');
  const preamble = [];
  const sections = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      sections.push({ title: m[1].trim(), body: [] });
      continue;
    }
    (sections.length ? sections.at(-1).body : preamble).push(line);
  }
  return { preamble, sections };
}

function render({ preamble, sections }) {
  const out = [...preamble];
  for (const s of sections) {
    while (out.length && out.at(-1).trim() === '') out.pop();
    out.push('', `## ${s.title}`, ...s.body);
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

const prNumberOf = (title) => {
  const m = title.match(/^PR\s*(\d+)\./);
  return m ? Number(m[1]) : null;
};

// 한 PR 절 안의 `### {이름}` 하위 절 본문을 뽑는다.
function subsectionLines(body, name) {
  const out = [];
  let inside = false;
  for (const line of body) {
    const m = line.match(/^###\s+(.*)$/);
    if (m) {
      inside = m[1].trim() === name;
      continue;
    }
    if (inside) out.push(line);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.file || !args.command) {
  console.error('사용: node <이 파일> <project.md> <list|add-pr|dependents|add-todo> [옵션]');
  process.exit(1);
}

// 파일이 없으면 만든다 — 「없으면 이 시점에 생성한다」가 여러 절에 적혀 있다.
const text = fs.existsSync(args.file) ? fs.readFileSync(args.file, 'utf8') : '';
const doc = parseSections(text);
const prSections = doc.sections.filter((s) => prNumberOf(s.title) !== null);

if (args.command === 'list') {
  if (!prSections.length) {
    console.log('확정된 PR 없음');
    process.exit(0);
  }
  for (const s of prSections) {
    const deps = subsectionLines(s.body, '의존').filter((l) => l.trim().startsWith('-'));
    console.log(`${s.title}`);
    deps.forEach((d) => console.log(`    ${d.trim()}`));
  }
  process.exit(0);
}

if (args.command === 'dependents') {
  if (!Number.isInteger(args.pr)) {
    console.error('dependents 에는 --pr N 이 필요합니다.');
    process.exit(1);
  }
  const hits = prSections.filter((s) =>
    subsectionLines(s.body, '의존').some((l) => Number(l.match(DEP_REF)?.[1]) === args.pr),
  );
  console.log(`[PR ${args.pr}에 의존하는 PR] ${hits.length}건`);
  for (const s of hits) {
    console.log(`  ${s.title}`);
    subsectionLines(s.body, '의존')
      .filter((l) => Number(l.match(DEP_REF)?.[1]) === args.pr)
      .forEach((l) => console.log(`      ${l.trim()}`));
  }
  process.exit(0);
}

if (args.command === 'add-pr') {
  if (!args.name) {
    console.error('add-pr 에는 --name 이 필요합니다.');
    process.exit(1);
  }
  // 번호는 확정 순서다. 진행 순서도 의존 순서도 아니라 늘 다음 번호를 준다.
  const next = prSections.reduce((max, s) => Math.max(max, prNumberOf(s.title)), 0) + 1;
  const body = [];
  for (const [title, key] of SUBS) {
    const items = args[key].length ? args[key] : ['없음'];
    body.push('', `### ${title}`, '', ...items.map((i) => `- ${i}`));
  }

  const section = { title: `PR ${next}. ${args.name}`, body };
  const at = doc.sections.findIndex((s) => s.title === UNASSIGNED);
  if (at === -1) {
    doc.sections.push(section, { title: UNASSIGNED, body: ['', '- 없음'] });
  } else {
    doc.sections.splice(at, 0, section);
  }
  fs.writeFileSync(args.file, render(doc), 'utf8');
  console.log(`PR ${next}. ${args.name} — 확정해 append했다 (${args.file})`);
  process.exit(0);
}

if (args.command === 'add-todo') {
  if (!args.item) {
    console.error('add-todo 에는 --item 이 필요합니다.');
    process.exit(1);
  }
  const target = args.unassigned
    ? doc.sections.find((s) => s.title === UNASSIGNED)
    : doc.sections.find((s) => prNumberOf(s.title) === args.pr);
  if (!target) {
    console.error(args.unassigned ? `'## ${UNASSIGNED}' 절이 없습니다.` : `PR ${args.pr} 절이 없습니다.`);
    process.exit(1);
  }

  // 미분류는 하위 절 없이 항목만 쌓는 보관소이고, PR 절은 「TODO」 하위 절 아래에 쌓는다.
  const anchor = args.unassigned ? null : target.body.findIndex((l) => l.trim() === '### TODO');
  if (anchor === -1) {
    console.error(`PR ${args.pr} 절에 '### TODO' 하위 절이 없습니다.`);
    process.exit(1);
  }
  let end = anchor === null ? target.body.length : target.body.length;
  if (anchor !== null) {
    end = target.body.findIndex((l, i) => i > anchor && /^###\s/.test(l));
    if (end === -1) end = target.body.length;
  }
  while (end > 0 && target.body[end - 1].trim() === '') end -= 1;
  // `- 없음`은 자리를 지키려고 넣은 것이라 실제 항목이 들어오면 비켜준다.
  if (target.body[end - 1]?.trim() === '- 없음') end -= 1;
  target.body.splice(end, end < target.body.length && target.body[end]?.trim() === '- 없음' ? 1 : 0, `- ${args.item}`);

  fs.writeFileSync(args.file, render(doc), 'utf8');
  console.log(`${args.unassigned ? UNASSIGNED : `PR ${args.pr}`} TODO에 추가했다: ${args.item}`);
  process.exit(0);
}

console.error(`모르는 명령: ${args.command}`);
process.exit(1);
