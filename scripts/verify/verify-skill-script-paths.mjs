#!/usr/bin/env node
// 전역 스킬 문서가 스크립트를 실행 위치(cwd) 기준 상대경로로 부르지 않는지 검사한다.
//
// 전역 스킬은 어느 레포에서 작업하다 불릴지 모른다. 그래서 `node scripts/foo.mjs`처럼 적으면
// 그때그때의 작업 디렉토리를 기준으로 풀려, 같은 이름의 폴더가 있는 레포에서는 엉뚱한 곳을
// 뒤지다 실패하고 없는 레포에서는 파일이 없다고 나온다. 2026-08-09에 `/backlog`가 이 모양으로
// 실패했고, 실행한 쪽은 "스킬이 없는 스크립트를 참조한다"고 오진했다.
//
// 로컬 스킬(`local/skills/`)은 대상이 아니다 — 그 레포 안에서만 도니 자기 레포 상대경로가 맞다.
// 실측(2026-08-09, 6개 레포): 전역 1건(전부 정탐), 로컬 11건(전부 자기 레포 경로라 정탐 0).
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const ROOT = 'deploy/skills';

// 인터프리터 + (옵션들) + 스크립트 파일 경로. 산문에 나온 파일 이름은 잡지 않는다.
const INVOCATION = /(?:^|[\s(`"'&|])(?:node|python3?|python\.exe|tsx|bash|sh|npx)\s+(?:--?[\w-]+\s+)*([^\s`"'|;)]+\.(?:mjs|cjs|js|ts|mts|py|sh))/g;

// 기준점이 확정된 형태 — 절대경로·홈·환경변수·자리표시자·`<설명>` 꼴은 통과.
const ANCHORED = /^(\/|~|\$|<|\{\{|[A-Za-z]:[\\/])/;

function collect(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, found);
    else if (entry.name.endsWith('.md')) found.push(full);
  }
  return found;
}

const offenders = [];
for (const file of collect(path.join(repoRoot, ROOT))) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(INVOCATION)) {
      if (ANCHORED.test(match[1])) continue;
      offenders.push({
        file: path.relative(repoRoot, file).replaceAll('\\', '/'),
        lineNo: index + 1,
        line: line.trim(),
      });
    }
  });
}

if (offenders.length > 0) {
  console.error('실행 위치에 따라 달라지는 스크립트 호출:');
  for (const { file, lineNo, line } of offenders) console.error(`  ${file}:${lineNo}: ${line}`);
  console.error('');
  console.error('스크립트가 스킬 폴더에 있으면 `{{skill_dir}}/<경로>`로 적는다 — 배포가 절대경로로 채운다.');
  console.error('다른 레포 소유면 그 레포 경로를 앞에 붙여 적는다.');
  process.exit(1);
}

console.log(`${ROOT}/ 스크립트 호출 모두 실행 위치 무관`);
