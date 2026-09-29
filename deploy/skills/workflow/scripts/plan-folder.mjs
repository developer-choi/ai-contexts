#!/usr/bin/env node
// `/plan/` 라이프사이클 폴더의 두 손일 — consumable 안내문 찍기와 남은 consumable 조회.
//
// 이 파일이 존재하는 이유:
//
//   notice — consumable 산출물을 새로 만들 때마다 같은 안내문 블록을 그대로 타이핑했다.
//     판단이 0인 보일러플레이트인데, **안 박아도 파일은 정상으로 보인다.** 나중에 그 파일을
//     소비하는 step이 「이건 큐인가 보존인가」를 모른 채 남겨두고, 잔존은 FINALIZE 마지막
//     훑기에서야 잡힌다.
//
//   left — 「지금 consumable에 뭐가 남았나」를 물을 수단이 없어 `ls`와 폴더 트리를 손으로
//     대조했다. consumable은 소비 시 즉시 폐기가 계약이라, 남은 것은 곧 아직 안 소비된 것이거나
//     소비하고 안 지운 것이다. 둘 다 누가 세지 않으면 드러나지 않는다.
//
// 판단은 안 한다 — 남은 것을 지울지(정말 소비됐는지)는 부르는 쪽이 정한다. 단순 읽기는
// 소비가 아니므로 남아 있는 것이 정상인 경우가 있다.
//
// 사용:
//   node <이 파일> notice              → 안내문 블록을 표준출력으로 (파일 앞에 붙인다)
//   node <이 파일> notice <파일>        → 그 파일 맨 앞에 붙인다 (이미 있으면 안 건드린다)
//   node <이 파일> left <plan 루트>     → 남은 consumable 파일과 안내문 누락분

import fs from 'node:fs';
import path from 'node:path';

const NOTICE = `> 이 파일은 큐 모델로 운영됩니다.
> 각 절을 **소비**한 step은 그 절을 즉시 삭제합니다.
> 모든 절이 비면 파일째 삭제합니다.
>
> **소비** = 그 절의 내용을 다른 산출물(overview·stub·PR 본문·코드 등)로 이관·녹임
> **단순 읽기·참조 조회는 소비 아님** — 사용자 질문 응답을 위해 잠시 본 케이스 등은 삭제 금지
`;

const MARKER = '이 파일은 큐 모델로 운영됩니다.';

const [command, target] = process.argv.slice(2);
if (!command) {
  console.error('사용: node <이 파일> <notice|left> [대상]');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (command === 'notice') {
  if (!target) {
    process.stdout.write(NOTICE);
    process.exit(0);
  }
  const body = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (body.includes(MARKER)) {
    console.log(`이미 붙어 있다: ${target}`);
    process.exit(0);
  }
  fs.writeFileSync(target, `${NOTICE}\n${body}`, 'utf8');
  console.log(`안내문을 붙였다: ${target}`);
  process.exit(0);
}

if (command === 'left') {
  if (!target) {
    console.error('left 에는 plan 루트 경로가 필요합니다.');
    process.exit(1);
  }
  const files = walk(target).filter((f) => f.replace(/\\/g, '/').includes('/consumable/'));
  const missing = files.filter((f) => /\.md$/i.test(f) && !fs.readFileSync(f, 'utf8').includes(MARKER));

  console.log(`[남은 consumable] ${files.length}건 — 소비 시 즉시 폐기가 계약이다`);
  files.forEach((f) => console.log(`  ${path.relative(target, f).replace(/\\/g, '/')}`));

  console.log(`\n[안내문 누락] ${missing.length}건 — 소비처가 이 파일을 큐로 못 알아본다`);
  missing.forEach((f) => console.log(`  ${path.relative(target, f).replace(/\\/g, '/')}`));

  if (missing.length) process.exit(1);
  process.exit(0);
}

console.error(`모르는 명령: ${command}`);
process.exit(1);
