#!/usr/bin/env node
// 모든 SKILL.md가 「## 목적」을 갖는지 검사한다.
// 목적이 없으면 "본문이 목적에서 벗어났는가"를 판정할 기준 자체가 없어, 스킬이 조용히 다른 것이 된다.
// 존재 여부는 결정론적이라 산문 규칙 대신 여기서 잡는다(내용이 적절한지는 사람·리뷰 몫).
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const ROOTS = ['deploy/skills', 'local/skills'];
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

const files = ROOTS.flatMap((root) => collect(path.join(repoRoot, root)));
const missing = files.filter((file) => !HEADING.test(fs.readFileSync(file, 'utf8')));

if (missing.length > 0) {
  console.error('「## 목적」이 없는 SKILL.md:');
  for (const file of missing) console.error(`  ${path.relative(repoRoot, file).replaceAll('\\', '/')}`);
  console.error('그 스킬이 무엇을 위해 있는지 한 줄로 적은 뒤 다시 실행하세요.');
  process.exit(1);
}

console.log(`SKILL.md ${files.length}개 모두 「## 목적」 보유`);
