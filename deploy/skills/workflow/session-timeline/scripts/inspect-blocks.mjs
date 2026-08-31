#!/usr/bin/env node
// 타임라인 md의 블록 구조를 읽는다 — 어떤 블록이 있고, 어느 AI 블록이 길고, 두 판본이 같은가.
//
// 이 파일이 존재하는 이유는 3단계(AI 장문 요약 치환)에 검사기가 없었기 때문이다.
// 「150자 초과 AI 블록」을 고르는 일은 순수 계산인데 AI가 md를 훑어 눈으로 골랐고,
// 「다른 블록·헤더·구분자·순서·개수는 그대로 두라」는 보존 조건은 주의문으로만 서 있었다.
// 서브에이전트가 블록 하나를 통째로 삼켜도 다음 단계(insert-headings)는 **삽입 전후**만
// 비교하므로, 이미 줄어든 판본이 새 기준선이 되어 유실이 검사를 통과했다.
//
// 사용:
//   node <이 파일> <타임라인.md>                    → 블록 통계
//   node <이 파일> <타임라인.md> --over 150         → 그 길이를 넘는 AI 블록 목록 (치환 대상)
//   node <이 파일> <타임라인.md> --against <원본.md> → 두 판본의 블록 헤더를 대조 (보존 검사)
//   node <이 파일> <타임라인.md> --stamps           → 블록 시각 목록 (구간 json의 start 재료)

import fs from 'node:fs';

const BLOCK_HEADER = /^\*\*(\d+\/\d+ \d+:\d+) · (사용자|AI|시스템)\*\*/;

function parseArgs(argv) {
  const args = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--over') args.over = Number(argv[++i]);
    else if (argv[i] === '--against') args.against = argv[++i];
    else if (argv[i] === '--stamps') args.stamps = true;
    else rest.push(argv[i]);
  }
  args.input = rest[0];
  return args;
}

// 블록 = 헤더 한 줄 + 다음 헤더 전까지의 본문. 구분자·삽입된 `## ` 헤딩은 본문 길이에서 뺀다 —
// 치환 대상을 고르는 기준이 발화 길이여야 하기 때문이다.
function readBlocks(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const blocks = [];
  for (const line of lines) {
    const m = line.match(BLOCK_HEADER);
    if (m) {
      blocks.push({ at: m[1], speaker: m[2], body: [] });
      continue;
    }
    if (!blocks.length) continue;
    if (line.trim() === '---' || /^##\s/.test(line)) continue;
    blocks.at(-1).body.push(line);
  }
  return blocks.map((b) => ({ ...b, length: b.body.join('\n').trim().length }));
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
  console.error('사용: node <이 파일> <타임라인.md> [--over N] [--against <원본.md>] [--stamps]');
  process.exit(1);
}

const blocks = readBlocks(args.input);
const counted = (speaker) => blocks.filter((b) => b.speaker === speaker).length;

if (args.stamps) {
  blocks.forEach((b) => console.log(`${b.at} · ${b.speaker} (${b.length}자)`));
  process.exit(0);
}

console.log(`blocks=${blocks.length} 사용자=${counted('사용자')} AI=${counted('AI')} 시스템=${counted('시스템')}`);

if (args.over) {
  const long = blocks.filter((b) => b.speaker === 'AI' && b.length > args.over);
  console.log(`\n[${args.over}자 초과 AI 블록] ${long.length}건 — 치환 대상`);
  long.forEach((b) => console.log(`  ${b.at} (${b.length}자)`));
}

if (args.against) {
  const base = readBlocks(args.against);
  const key = (b) => `${b.at} · ${b.speaker}`;
  const baseKeys = base.map(key);
  const nowKeys = blocks.map(key);
  const missing = baseKeys.filter((k) => !nowKeys.includes(k));
  const added = nowKeys.filter((k) => !baseKeys.includes(k));
  // 순서까지 본다 — 개수가 같아도 자리가 바뀌면 대화가 다른 이야기가 된다.
  const reordered = baseKeys.length === nowKeys.length && baseKeys.some((k, i) => k !== nowKeys[i]);

  const problems = [];
  if (missing.length) problems.push(`사라진 블록 ${missing.length}건: ${missing.join(', ')}`);
  if (added.length) problems.push(`늘어난 블록 ${added.length}건: ${added.join(', ')}`);
  if (reordered) problems.push('블록 순서가 바뀌었다');

  console.log(`\n[보존 대조] 기준 ${base.length}블록 vs 현재 ${blocks.length}블록`);
  if (!problems.length) {
    console.log('  차이 없음');
  } else {
    problems.forEach((p) => console.log(`  ${p}`));
    process.exit(1);
  }
}
