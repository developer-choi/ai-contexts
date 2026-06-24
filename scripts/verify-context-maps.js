#!/usr/bin/env node
// deploy/contexts/<dir>/map.md ↔ 같은 디렉토리 .md 파일 목록의 정합을 검증한다.
//
// map.md는 모델이 무엇을 읽을지 결정하는 인덱스다. 파일을 추가·삭제·이동하면서 map.md를
// 안 고치면 새 규칙이 영영 로드 안 되거나(등록 누락), 없는 파일을 가리킨다(dangling).
// 둘 다 사람이 깜빡하기 쉬운 "파일 목록" 면이라 기계로 강제한다. (역할 설명·태그 의미·로드
// 규칙은 판단이 끼는 잔여 면이라 검사하지 않는다 — coupling.json surfacing이 담당.)
//
// 등록 누락 판정에서 일부러 빼는 파일이 있다:
//   - README.md: 디렉토리 자체 readme라 로드 목록이 아니다 (basename으로 제외).
//   - 종속 예시: map의 등록 파일이 마크다운 링크로 끌어쓰는 .md (예: readability.md가
//     [..](examples/product-list.md)로 참조). 링크 도달 가능하면 독립 등록 불필요.
// 이 둘은 손-관리 제외목록이 아니라 derivable 규칙이라, 짝꿍을 새로 만들지 않는다.

const fs = require('fs');
const path = require('path');

const contextsDir = path.join(__dirname, '..', 'deploy', 'contexts');

// "상대경로.md" 또는 "상대경로.md [태그]" 한 줄 (헤딩·표·링크·산문 줄은 안 걸림)
const LISTED_RE = /^([\w][\w./-]*\.md)(\s+\[[\w-]+\])?\s*$/;
// 마크다운 링크 [..](target.md) 또는 [..](target.md#anchor)
const LINK_RE = /\]\(([^)\s]+\.md)(#[^)]*)?\)/g;

function findMapDirs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findMapDirs(full));
    else if (e.name === 'map.md') out.push(dir);
  }
  return out;
}

function listMdFiles(dir) {
  // dir 기준 상대경로(POSIX)로 모든 .md (map.md 제외)
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md') && e.name !== 'map.md') {
        out.push(path.relative(dir, full).split(path.sep).join('/'));
      }
    }
  })(dir);
  return out;
}

function parseListed(mapText) {
  const out = [];
  for (const line of mapText.split(/\r?\n/)) {
    const m = line.match(LISTED_RE);
    if (m) out.push(m[1]);
  }
  return out;
}

function linksFrom(dir, relFile) {
  // relFile 안의 상대 .md 링크를 dir 기준 상대경로로 해석 (외부·절대·dir 밖 제외)
  const text = fs.readFileSync(path.join(dir, relFile), 'utf8');
  const baseDir = path.posix.dirname(relFile);
  const out = [];
  for (const m of text.matchAll(LINK_RE)) {
    const t = m[1];
    if (t.startsWith('~') || t.startsWith('/') || /^[a-z]+:/i.test(t)) continue;
    const resolved = path.posix.normalize(path.posix.join(baseDir === '.' ? '' : baseDir, t));
    if (resolved.startsWith('..')) continue;
    out.push(resolved);
  }
  return out;
}

function main() {
  const failures = [];
  const check = (cond, msg) => {
    if (cond) console.log(`  PASS  ${msg}`);
    else { console.error(`  FAIL  ${msg}`); failures.push(msg); }
  };

  console.log('contexts map.md 목록 정합 검증 중...');

  for (const dir of findMapDirs(contextsDir)) {
    const rel = path.relative(contextsDir, dir).split(path.sep).join('/');
    const actual = listMdFiles(dir);
    const actualSet = new Set(actual);
    const listed = parseListed(fs.readFileSync(path.join(dir, 'map.md'), 'utf8'));

    // dangling: map이 적었는데 실제로 없는 파일
    const dangling = listed.filter((p) => !actualSet.has(p));
    check(dangling.length === 0, `${rel}: map의 모든 등록이 실존 (없는 파일: ${dangling.join(', ') || '없음'})`);

    // covered: 등록 ∪ 링크 도달 (BFS) ∪ README
    const covered = new Set(listed);
    const queue = [...listed];
    while (queue.length) {
      const f = queue.shift();
      if (!actualSet.has(f)) continue; // 실존 파일만 링크 추적
      for (const link of linksFrom(dir, f)) {
        if (actualSet.has(link) && !covered.has(link)) {
          covered.add(link);
          queue.push(link);
        }
      }
    }
    const unlisted = actual.filter((p) => path.posix.basename(p) !== 'README.md' && !covered.has(p));
    check(unlisted.length === 0, `${rel}: 모든 .md가 map에 등록되거나 링크로 도달 (누락: ${unlisted.join(', ') || '없음'})`);
  }

  if (failures.length) {
    console.error(`contexts map.md 정합 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('contexts map.md 정합 정상');
}

if (require.main === module) main();

module.exports = { parseListed, linksFrom, listMdFiles };
