#!/usr/bin/env node
// 모든 SKILL.md가 「## 목적」을 갖는지 검사한다.
// 목적이 없으면 "본문이 목적에서 벗어났는가"를 판정할 기준 자체가 없어, 스킬이 조용히 다른 것이 된다.
// 존재 여부는 결정론적이라 산문 규칙 대신 여기서 잡는다(내용이 적절한지는 사람·리뷰 몫).
//
// 인자 없이 부르면 AC 자신만, `--local`이면 배포가 닿는 모든 레포의 `local/skills`를 본다.
// AC만 보면 이 규칙이 AC 안에서만 살아 남의 레포 스킬은 목적 없이 배포된다 — 규칙은 전역인데
// 검사만 한 레포였던 것이 구멍이었다.
import fs from 'node:fs';
import path from 'node:path';
import { listLocalRepos } from '../local-system/local-deploy-lib.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const HEADING = /^##[ \t]+목적[ \t]*$/m;

function collect(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, found);
    else if (entry.name === 'SKILL.md') found.push(full);
  }
  return found;
}

const local = process.argv.includes('--local');
const scanned = local
  ? listLocalRepos().map((repo) => ({ repo, dirs: ['local/skills'] }))
  : [{ repo: repoRoot, dirs: ['deploy/skills', 'local/skills'] }];

const files = scanned.flatMap(({ repo, dirs }) =>
  dirs.flatMap((dir) => collect(path.join(repo, dir)).map((file) => ({ repo, file }))),
);
const missing = files.filter(({ file }) => !HEADING.test(fs.readFileSync(file, 'utf8')));

if (missing.length > 0) {
  console.error('「## 목적」이 없는 SKILL.md:');
  for (const { repo, file } of missing) {
    const rel = path.relative(path.dirname(repo), file).replaceAll('\\', '/');
    console.error(`  ${rel}`);
  }
  console.error('그 스킬이 무엇을 위해 있는지 한 줄로 적은 뒤 다시 실행하세요.');
  process.exit(1);
}

console.log(`SKILL.md ${files.length}개 모두 「## 목적」 보유`);
