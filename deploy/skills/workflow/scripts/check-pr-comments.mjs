#!/usr/bin/env node
// PR diff의 주석 게이트 — 금지 주석 잔존과 미배정 blanket disable 고아를 함께 본다.
//
// 이 파일이 존재하는 이유: 두 점검 다 정규식인데 산문이 **서브에이전트에게** 시키고 있었다.
// step-6.1.5는 "sonnet 리뷰어를 spawn해 금지 주석이 잔존하는지 재점검"이라 적혀 있는데,
// 리뷰어가 "0건"이라고 말하면 그걸로 끝난다 — 확인할 방법이 없고, 놓친 마커는 머지된 코드에
// 남아 나중에 드러난다. 판단이 1도 없는 대조에 판단하는 도구를 쓰면 그 결과도 판단이 된다.
//
// 고아 점검(step-6.1.6)은 「마커 문구는 comments.md가 단일 출처」라고 적혀 있었지만 정작
// 그쪽은 문구를 *예시*로만 들고 있었다("추적 가능한 고정 문구를 남긴다 (예: …)"). 고정이
// 아니면 탐지가 설 수 없으므로 여기서 문구를 못박고, comments.md가 이 파일을 가리킨다.
//
// 판단은 안 한다 — 걸린 것을 어떻게 처리할지(해소·이연·어느 PR에 배정)는 부르는 쪽이 정한다.
//
// 사용:
//   node <이 파일> --base <기준 ref>                     → 금지 주석 잔존 점검 (PR diff)
//   node <이 파일> --base <기준 ref> --project <project.md>  → 미배정 blanket disable 고아까지
//   node <이 파일> --paths <경로,경로> --marker USER_REVIEW  → IMPL 시작 게이트 (구현 대상 경로)
//   node <이 파일> --paths <경로,경로>                     → 종료 게이트 (TODO 전부 0건)
//
// 어느 모드든 `TODO [AI_IMPL]`이 인용한 출처가 소멸 버킷을 가리키면 함께 짚는다.
//
// 걸린 것이 있으면 exit 1.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 코드 안에 남으면 안 되는 마커. comments.md 「PR 이연 마커 — 코드 안 금지」와
// 「코드 안 TODO는 본 PR 안 모두 해소. IMPL 종료 시 0건」이 그 근거다.
const FORBIDDEN = [/\bTODO\b/, /\bFIXME\b/, /\bAI_IMPL\b/];
// 미리팩토링 격리 blanket disable의 추적 문구. 이 문자열이 정본이다 — 바꾸면 고아 탐지가 멈춘다.
const ISOLATION_MARKER = '미리팩토링 코드(정적 분석 도입 PR)';
// md는 대상이 아니다 — 계획 문서에는 `### TODO` 같은 절 이름이 정상적으로 들어 있다.
const SKIP = /\.(md|mdx)$/;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);

// `TODO [AI_IMPL]: 설명 — <출처>` 의 출처는 영속 파일만 된다. consumable·retained는 소비되면
// 사라지므로, 그때 이 TODO를 채우러 온 사람이 출처를 잃는다 — 이 규칙이 막으려던 바로 그 상황이다.
// 인용 시점엔 경로가 실존하므로 아무 신호가 없어, 시차를 두고 조용히 터진다.
const AI_IMPL_LINE = /TODO\s*\[AI_IMPL\]/;
const EPHEMERAL_SOURCE = /(^|[\s(`'"])[^\s`'")]*\/(consumable|retained)\//;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--project') args.project = argv[++i];
    else if (argv[i] === '--paths') args.paths = argv[++i];
    else if (argv[i] === '--marker') args.marker = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.base && !args.paths) {
  console.error('사용: node <이 파일> (--base <기준 ref> | --paths <경로,경로>) [--project <project.md>] [--marker USER_REVIEW]');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (!SKIP.test(full)) out.push(full);
  }
  return out;
}

// 볼 줄을 모은다. diff 모드는 **추가된 줄만** 본다 — 지워지는 줄의 마커는 이 PR이 걷어내는
// 중인 것이라 걸 일이 아니다. paths 모드는 그 경로의 현재 내용을 통째로 본다(게이트는 잔존을 센다).
const added = [];
if (args.paths) {
  for (const root of args.paths.split(',').map((s) => s.trim()).filter(Boolean)) {
    const files = fs.statSync(root).isDirectory() ? walk(root) : [root];
    for (const f of files) {
      fs.readFileSync(f, 'utf8')
        .split('\n')
        .forEach((text, i) => added.push({ file: `${f}:${i + 1}`, text }));
    }
  }
} else {
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--unified=0', `${args.base}...HEAD`], { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) {
    console.error(`git diff 실패: ${`${e.stderr || e.message}`.trim().split('\n').pop()}`);
    process.exit(1);
  }
  let file = null;
  for (const line of diff.split('\n')) {
    const head = line.match(/^\+\+\+ b\/(.*)$/);
    if (head) {
      file = head[1] === '/dev/null' ? null : head[1];
      continue;
    }
    if (!file || SKIP.test(file)) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) added.push({ file, text: line.slice(1) });
  }
}

const problems = [];

// `--marker USER_REVIEW`는 IMPL 시작 게이트라 그 마커만 센다. 종료 게이트는 TODO 전부가 대상이다.
const gate = args.marker ? [new RegExp(`TODO\\s*\\[${args.marker}\\]`)] : FORBIDDEN;
const label = args.marker ? `TODO [${args.marker}] 잔존` : '금지 주석 잔존';
const forbidden = added.filter((l) => gate.some((re) => re.test(l.text)));
console.log(`[${label}] ${forbidden.length}건`);
for (const l of forbidden) console.log(`  ${l.file}: ${l.text.trim().slice(0, 120)}`);
if (forbidden.length) {
  problems.push(args.marker ? `${label} — IMPL을 중단하고 사용자에게 보고한다` : '금지 주석이 남아 있다 — step-5 Implementer 흐름으로 해소한다');
}

const ephemeral = added.filter((l) => AI_IMPL_LINE.test(l.text) && EPHEMERAL_SOURCE.test(l.text));
console.log(`\n[소멸 버킷을 인용한 AI_IMPL] ${ephemeral.length}건 — consumable·retained는 소비되면 사라진다`);
for (const l of ephemeral) console.log(`  ${l.file}: ${l.text.trim().slice(0, 120)}`);
if (ephemeral.length) problems.push('AI_IMPL 출처가 영속 파일이 아니다 — 소비되면 출처를 잃는다');

if (args.project) {
  // 격리 마커가 붙은 blanket disable 파일만 본다. 모든 blanket disable을 훑으면 생성 파일 등이 오탐된다.
  const isolated = [...new Set(added.filter((l) => l.text.includes(ISOLATION_MARKER)).map((l) => l.file))];
  const registered = fs.existsSync(args.project) ? fs.readFileSync(args.project, 'utf8') : '';
  const orphans = isolated.filter((f) => !registered.includes(f));

  console.log(`\n[미배정 blanket disable] 격리 ${isolated.length}건 중 고아 ${orphans.length}건`);
  for (const f of orphans) console.log(`  ${f}`);
  if (orphans.length) {
    problems.push('어느 PR에도 배정 안 된 격리 파일이 있다 — 사용자가 배정할 PR을 정해 project.md에 등록한다');
  }
}

if (problems.length) {
  console.error(`\n${problems.join('\n')}`);
  process.exit(1);
}
