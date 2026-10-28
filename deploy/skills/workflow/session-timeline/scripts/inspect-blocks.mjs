#!/usr/bin/env node
// 타임라인 md의 블록 구조를 읽는다 — 어떤 블록이 있고, 어느 AI 블록이 길고, 두 판본이 같은가.
//
// 이 파일이 존재하는 이유는 3단계(AI 장문 요약 치환)에 검사기가 없었기 때문이다.
// 「150자 초과 AI 블록」을 고르는 일은 순수 계산인데 AI가 md를 훑어 눈으로 골랐고,
// 「다른 블록·헤더·구분자·순서·개수는 그대로 두라」는 보존 조건은 주의문으로만 서 있었다.
// 서브에이전트가 블록 하나를 통째로 삼켜도 다음 단계(insert-headings)는 **삽입 전후**만
// 비교하므로, 이미 줄어든 판본이 새 기준선이 되어 유실이 검사를 통과했다.
//
// 사용법은 인자 없이 부르면 나온다.

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
  // 시각은 분 단위라 같은 분에 블록이 여럿일 수 있다 — 두 번째부터 ` #n`을 붙여 블록마다 이름이 하나가 되게 한다.
  // insert-headings.mjs가 구간 start를 같은 꼴로 받는다.
  const seen = new Map();
  return blocks.map((b) => {
    const n = (seen.get(b.at) ?? 0) + 1;
    seen.set(b.at, n);
    return { ...b, stamp: n === 1 ? b.at : `${b.at} #${n}`, length: b.body.join('\n').trim().length };
  });
}

// 두 판본의 블록 키 열을 최장 공통 부분열로 맞춰, 기준에만 있는 블록과 현재에만 있는 블록의 자리를 낸다.
// 키를 집합으로 비교하면 같은 분·같은 화자 블록 하나가 사라져도 남은 쪽이 키를 채워 차이가 안 보인다.
function alignKeys(base, now) {
  const dp = Array.from({ length: base.length + 1 }, () => new Uint32Array(now.length + 1));
  for (let i = base.length - 1; i >= 0; i -= 1) {
    for (let j = now.length - 1; j >= 0; j -= 1) {
      dp[i][j] = base[i] === now[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const missing = [];
  const added = [];
  let i = 0;
  let j = 0;
  while (i < base.length || j < now.length) {
    if (i < base.length && j < now.length && base[i] === now[j]) { i += 1; j += 1; }
    else if (j >= now.length || (i < base.length && dp[i + 1][j] >= dp[i][j + 1])) missing.push(i++);
    else added.push(j++);
  }
  return { missing, added };
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
  console.error(`사용:
  node <이 파일> <타임라인.md>                    → 블록 통계
  node <이 파일> <타임라인.md> --over <글자 수>   → 그 길이를 넘는 AI 블록 목록 (치환 대상)
  node <이 파일> <타임라인.md> --against <원본.md> → 두 판본의 블록 헤더를 대조 (보존 검사)
  node <이 파일> <타임라인.md> --stamps           → 블록 시각 목록 (구간 json의 start 재료)`);
  process.exit(1);
}

const blocks = readBlocks(args.input);
const counted = (speaker) => blocks.filter((b) => b.speaker === speaker).length;

if (args.stamps) {
  blocks.forEach((b) => console.log(`${b.stamp} · ${b.speaker} (${b.length}자)`));
  process.exit(0);
}

console.log(`blocks=${blocks.length} 사용자=${counted('사용자')} AI=${counted('AI')} 시스템=${counted('시스템')}`);

if (args.over) {
  const long = blocks.filter((b) => b.speaker === 'AI' && b.length > args.over);
  console.log(`\n[${args.over}자 초과 AI 블록] ${long.length}건 — 치환 대상`);
  long.forEach((b) => console.log(`  ${b.stamp} (${b.length}자)`));
}

if (args.against) {
  const base = readBlocks(args.against);
  const key = (b) => `${b.at} · ${b.speaker}`;
  // 순서까지 본다 — 개수가 같아도 자리가 바뀌면 대화가 다른 이야기가 된다. 자리가 바뀐 블록은 사라진 쪽과 늘어난 쪽에 함께 찍힌다.
  const { missing, added } = alignKeys(base.map(key), blocks.map(key));
  const describe = (b) => `${b.stamp} · ${b.speaker} 「${(b.body.find((l) => l.trim()) ?? '').trim().slice(0, 40)}」`;

  const problems = [];
  if (missing.length) problems.push(`사라진 블록 ${missing.length}건:\n${missing.map((i) => `    ${describe(base[i])}`).join('\n')}`);
  if (added.length) problems.push(`늘어난 블록 ${added.length}건:\n${added.map((j) => `    ${describe(blocks[j])}`).join('\n')}`);

  console.log(`\n[보존 대조] 기준 ${base.length}블록 vs 현재 ${blocks.length}블록`);
  if (!problems.length) {
    console.log('  차이 없음');
  } else {
    problems.forEach((p) => console.log(`  ${p}`));
    process.exit(1);
  }
}
