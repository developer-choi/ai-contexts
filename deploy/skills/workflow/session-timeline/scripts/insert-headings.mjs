#!/usr/bin/env node
// 평면 타임라인 md에 구간 헤딩과 상단 조망을 넣고, 넣다 블록이 사라지지 않았는지 검증한다.
//
// 이 파일이 존재하는 이유: 삽입 로직을 회차마다 새로 짜다 블록이 조용히 유실된 적이 있고,
// 유실은 산출물을 통독하기 전엔 안 보인다. 여기서 블록 총수·헤딩 수·미매칭을 함께 검증해
// 어긋나면 파일을 쓰지 않고 실패한다.
//
// 헤딩 문자열도 여기서 만든다. 예전에는 호출하는 쪽이 `"8/16 15:31 ~ 16:04 (33분) — 요약"`을
// 통째로 넘겼는데, 그러면 **끝시각(= 다음 구간의 시작)과 소요분을 매 구간 손으로 계산**하고
// 같은 값을 상단 조망 리스트에 한 번 더 옮겨 적게 된다. 이 스크립트는 그 문자열을 불투명하게
// 받아 그대로 꽂았으므로 산술이 틀려도 exit 0이었다 — 그런데 이 문서의 존재 이유가
// 「이걸 이 시간만큼 써서 했다고?」를 드러내는 것이라, 조용히 틀린 숫자가 결론을 오염시킨다.
// 이제 넘기는 것은 구간의 시작 시각과 한 일 요약뿐이고 나머지는 계산된다.
//
// 사용: node <이 파일> <타임라인.md> --segs <구간.json> [--out <파일>] [--note "집계 한 줄"]
// 구간.json: [{ "start": "8/16 15:31", "summary": "한 일 요약" }, ...]
//   start = 그 구간 첫 블록의 시각. 블록 헤더 `**{시각} · `와 정확히 일치해야 한다.
//   (블록 시각 목록은 `inspect-blocks.mjs`가 낸다 — md를 통독해 옮겨 적지 않는다.)

import fs from 'node:fs';

const CAVEAT = '구간 경계는 발화 시각 기준 — 끝은 다음 발화 시각으로 근사(사용자 부재 시간 포함 가능)';

function parseArgs(argv) {
  const args = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--segs') args.segs = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--note') args.note = argv[++i];
    else rest.push(argv[i]);
  }
  args.input = rest[0];
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.segs) {
  console.error('사용: node <이 파일> <타임라인.md> --segs <구간.json> [--out <파일>] [--note "집계 한 줄"]');
  process.exit(1);
}

const source = fs.readFileSync(args.input, 'utf8');
const segments = JSON.parse(fs.readFileSync(args.segs, 'utf8'));

const BLOCK_HEADER = /^\*\*(\d+\/\d+ \d+:\d+) · /;
const lines = source.split('\n');
const stamps = lines.map((line) => line.match(BLOCK_HEADER)).filter(Boolean).map((m) => m[1]);
const before = stamps.length;

// `M/DD HH:MM`에는 연도가 없다. 블록은 시간 순이므로, 값이 뒤로 가면 해를 넘긴 것으로 본다.
// 이렇게 해야 12/31 → 1/1 세션에서 소요분이 음수가 되지 않는다.
const minutesAt = new Map();
{
  let year = 2000;
  let prev = -1;
  for (const s of stamps) {
    if (minutesAt.has(s)) continue;
    const [date, time] = s.split(' ');
    const [mo, day] = date.split('/').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    let value = Date.UTC(year, mo - 1, day, hh, mm) / 60000;
    if (value < prev) {
      year += 1;
      value = Date.UTC(year, mo - 1, day, hh, mm) / 60000;
    }
    prev = value;
    minutesAt.set(s, value);
  }
}

const dateOf = (s) => s.split(' ')[0];
const timeOf = (s) => s.split(' ')[1];
// 끝쪽 날짜는 구간이 자정을 넘었을 때만 적는다 — 안 넘었으면 같은 날짜가 두 번 나와 읽기만 무겁다.
const rangeOf = (start, end) => `${start} ~ ${dateOf(end) === dateOf(start) ? timeOf(end) : end}`;

function fail(messages) {
  console.error(messages.join('\n'));
  console.error('파일을 쓰지 않았다.');
  process.exit(1);
}

const unknown = segments.filter((s) => !minutesAt.has(s.start));
if (unknown.length) fail([`블록에 없는 시작 시각 ${unknown.length}건: ${unknown.map((s) => s.start).join(', ')}`]);

const dupes = segments.map((s) => s.start).filter((s, i, all) => all.indexOf(s) !== i);
if (dupes.length) fail([`구간 시작 시각이 중복이다: ${dupes.join(', ')} — 어느 블록에 붙일지 갈리지 않는다`]);

const ordered = [...segments].sort((a, b) => minutesAt.get(a.start) - minutesAt.get(b.start));
const lastStamp = stamps[stamps.length - 1];

// 끝시각 = 다음 구간의 시작. 마지막 구간만 문서의 마지막 블록으로 닫는다.
const spans = ordered.map((seg, i) => {
  const end = i + 1 < ordered.length ? ordered[i + 1].start : lastStamp;
  const minutes = minutesAt.get(end) - minutesAt.get(seg.start);
  return { ...seg, end, minutes, label: `${rangeOf(seg.start, end)} (${minutes}분)` };
});

const pending = new Map(spans.map((s) => [s.start, `${s.label} — ${s.summary}`]));

const body = [];
let inserted = 0;
let firstHeaderSeen = false;
for (const line of lines) {
  const match = line.match(BLOCK_HEADER);
  if (match && !firstHeaderSeen) {
    firstHeaderSeen = true;
    // 상단 조망은 첫 블록 바로 앞에 둔다 — 그 앞은 전부 메타 인용이라, 이 자리가 곧 「메타 인용 아래」다.
    const total = minutesAt.get(lastStamp) - minutesAt.get(stamps[0]);
    body.push(`> **합계**: 총 ${total}분${args.note ? ` — ${args.note}` : ''}`, '');
    body.push('# 시간대별 요약본', '', CAVEAT, '');
    for (const s of spans) body.push(`- **${s.label}** — ${s.summary}`);
    body.push('');
  }
  if (match && pending.has(match[1])) {
    body.push(`## ${pending.get(match[1])}`, '');
    pending.delete(match[1]);
    inserted += 1;
  }
  body.push(line);
}

const result = body.join('\n');
const after = result.split('\n').filter((line) => BLOCK_HEADER.test(line)).length;

// 삽입한 헤딩만 센다 — 대화 본문에도 `## `로 시작하는 줄이 있어 파일 전체를 세면 늘 어긋난다.
const problems = [];
if (after !== before) problems.push(`블록 총수가 ${before} → ${after}로 변했다`);
if (pending.size > 0) problems.push(`매칭 실패 ${pending.size}건: ${[...pending.keys()].join(', ')}`);
if (inserted !== segments.length) problems.push(`삽입 ${inserted}개 ≠ 구간 ${segments.length}개`);
if (problems.length > 0) fail(problems);

if (args.out) fs.writeFileSync(args.out, result, 'utf8');
else process.stdout.write(result);

console.error(`blocks=${after} headings=${inserted} miss=0 총 ${minutesAt.get(lastStamp) - minutesAt.get(stamps[0])}분`);
