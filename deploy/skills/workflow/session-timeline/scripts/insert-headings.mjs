#!/usr/bin/env node
// 평면 타임라인 md에 구간 헤딩을 끼워 넣고, 끼워 넣다 블록이 사라지지 않았는지 검증한다.
//
// 이 파일이 존재하는 이유: 삽입 로직을 회차마다 새로 짜다 블록이 조용히 유실된 적이 있고,
// 유실은 산출물을 통독하기 전엔 안 보인다. 여기서 블록 총수·헤딩 수·미매칭을 함께 검증해
// 어긋나면 파일을 쓰지 않고 실패한다.
//
// 사용: node <이 파일> <타임라인.md> --segs <구간.json> [--out <파일>]
// 구간.json: [{ "start": "8/16 15:31", "heading": "8/16 15:31 ~ 16:04 (33분) — 한 일 요약" }, ...]
//   start = 그 구간 첫 블록의 시각. 블록 헤더 `**{시각} · `와 정확히 일치해야 한다.

import fs from 'node:fs';

function parseArgs(argv) {
  const args = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--segs') args.segs = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else rest.push(argv[i]);
  }
  args.input = rest[0];
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.segs) {
  console.error('사용: node <이 파일> <타임라인.md> --segs <구간.json> [--out <파일>]');
  process.exit(1);
}

const source = fs.readFileSync(args.input, 'utf8');
const segments = JSON.parse(fs.readFileSync(args.segs, 'utf8'));

const BLOCK_HEADER = /^\*\*(\d+\/\d+ \d+:\d+) · /;
const lines = source.split('\n');
const before = lines.filter((line) => BLOCK_HEADER.test(line)).length;

const pending = new Map();
for (const segment of segments) {
  if (pending.has(segment.start)) {
    console.error(`구간 시작 시각이 중복이다: ${segment.start} — 어느 블록에 붙일지 갈리지 않는다`);
    process.exit(1);
  }
  pending.set(segment.start, segment.heading);
}

const out = [];
let inserted = 0;
for (const line of lines) {
  const match = line.match(BLOCK_HEADER);
  if (match && pending.has(match[1])) {
    out.push(`## ${pending.get(match[1])}`, '');
    pending.delete(match[1]);
    inserted += 1;
  }
  out.push(line);
}

const result = out.join('\n');
const after = result.split('\n').filter((line) => BLOCK_HEADER.test(line)).length;

// 삽입한 헤딩만 센다 — 대화 본문에도 `## `로 시작하는 줄이 있어 파일 전체를 세면 늘 어긋난다.
const problems = [];
if (after !== before) problems.push(`블록 총수가 ${before} → ${after}로 변했다`);
if (pending.size > 0) problems.push(`매칭 실패 ${pending.size}건: ${[...pending.keys()].join(', ')}`);
if (inserted !== segments.length) problems.push(`삽입 ${inserted}개 ≠ 구간 ${segments.length}개`);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error('파일을 쓰지 않았다.');
  process.exit(1);
}

if (args.out) fs.writeFileSync(args.out, result, 'utf8');
else process.stdout.write(result);

console.error(`blocks=${after} headings=${inserted} miss=0`);
