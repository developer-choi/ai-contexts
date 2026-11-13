#!/usr/bin/env node
// 사용법: verify-cli-usage.md (같은 폴더)
//
// 인자를 받는 스크립트마다 같은 폴더·같은 이름의 사용법 md가 있고, 사용법이 그 md에만 있는지 본다.
// 짓는 법은 [CLI 스크립트의 사용법은 짝 md에](../../deploy/contexts/rules-as-code-authoring.md#cli-스크립트의-사용법은-짝-md에).
//
// 사용법이 머리 주석에만 있으면 인자만 알고 싶은 AI가 소스를 통째로 연다(steps.mjs 50KB가 그랬다).
// 주석·USAGE 상수·md에 나눠 두면 한쪽만 고쳐져 어긋난다. 짝 md를 빠뜨린 스크립트는 사람이 눈으로
// 못 잡으므로 커밋 때 알린다.
//
// 이 불변식은 레포를 가리지 않아 sync가 이 파일을 ~/.ai-contexts/로 복사해 기기 전역 pre-commit 훅으로
// 건다(scripts/environment/precommit-hooks.mjs). 그래서 AC의 다른 모듈을 import하지 않고, 기준 레포는
// 이 파일 위치가 아니라 커밋 중인 레포(cwd의 git toplevel)다.
//
// 막지 않고 알리기만 한다. 인자를 읽어도 git·다른 스크립트만 실행하는 파일은 짝 md가 필요 없는데,
// 그 구분은 정적 검사로 못 하고 커밋하는 쪽이 안다. 막으면 그런 파일마다 면제 장치가 따로 필요해진다.
//
// 정적 검사다 — 스크립트를 실행하지 않는다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RULE_DOC = 'ai-contexts 레포 deploy/contexts/rules-as-code-authoring.md#cli-스크립트의-사용법은-짝-md에';
const USAGE_DOC = 'ai-contexts 레포 scripts/hooks/verify-cli-usage.md';

// argv[0]·[1]만 읽는 파일은 진입점 판별일 뿐 인자를 받지 않는다. 그 밖의 읽기(`[2]`·`.slice(`·
// `.includes(`·별칭 대입·구조분해)는 모두 인자를 받는 것으로 본다.
const READS_ARGS = /process\.argv(?!\s*\[\s*[01]\s*\])/;

const SKIP_DIRS = new Set(['node_modules', '.git', '.claude']);

const slash = (filePath) => filePath.replace(/\\/g, '/');

function fail(message) {
  console.error(`${message}\n사용법: ${USAGE_DOC}`);
  process.exit(1);
}

function gitToplevel() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return process.cwd();
  }
}

function parseArgs(argv) {
  const paths = [];
  for (const arg of argv) {
    if (arg.startsWith('-')) fail(`모르는 옵션: ${arg}`);
    paths.push(arg);
  }
  return paths;
}

function walk(absolutePath, out) {
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    if (absolutePath.endsWith('.mjs')) out.push(absolutePath);
    return out;
  }
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    walk(path.join(absolutePath, entry.name), out);
  }
  return out;
}

// 커밋에 오른 .mjs와, 지워지거나 바뀐 짝 md의 .mjs. 짝 md만 지운 커밋도 잡아야 한다.
function stagedScripts(repoRoot) {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRD'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const files = new Set();
  for (const changedFile of out.split('\0').filter(Boolean)) {
    if (changedFile.endsWith('.mjs')) files.add(changedFile);
    else if (changedFile.endsWith('.md')) files.add(changedFile.replace(/\.md$/, '.mjs'));
  }
  return [...files].map((file) => path.join(repoRoot, file)).filter((absolutePath) => fs.existsSync(absolutePath));
}

// shebang 다음부터 이어지는 `//` 줄.
function headerLines(lines) {
  let index = lines[0]?.startsWith('#!') ? 1 : 0;
  const header = [];
  for (; index < lines.length && lines[index].startsWith('//'); index++) header.push({ lineNumber: index + 1, text: lines[index] });
  return header;
}

// 머리 주석에 남은 사용법: 호출 꼴(`node …x.mjs`, 줄머리 `node <이 파일> …`)이나 옵션을 줄머리에 둔 줄.
const HEADER_USAGE_LINES = [/\bnode\s+\S*\.mjs\b/, /^\/\/\s+node\s/, /^\/\/\s+--?[A-Za-z][\w-]*(\s|$)/];
// 사용법을 문자열로 든 상수(`USAGE`·`…_USAGE`). 짝 md 경로를 든 `USAGE_DOC`은 값이 경로라 안 걸린다.
const USAGE_CONST = /\bconst\s+\w*USAGE\s*=\s*(`|'|"|\[|\{)/;
// 문자열 안의 사용법 블록(`사용:\n…`·`사용법:\n…`).
const INLINE_USAGE = /사용(?:법)?:\s*(?:\\n|`\s*$)/;

function check(absolutePath, lines, toRelative) {
  const base = path.basename(absolutePath, '.mjs');
  const problems = [];
  const pair = absolutePath.replace(/\.mjs$/, '.md');
  if (!fs.existsSync(pair)) problems.push(`짝 md 없음: ${toRelative(pair)}를 만들고 사용법을 그리로 옮긴다`);

  const header = headerLines(lines);
  const expected = `// 사용법: ${base}.md (같은 폴더)`;
  if (header[0]?.text.trim() !== expected)
    problems.push(`머리 주석 첫 줄이 \`${expected}\`가 아니다. 소스를 연 AI가 사용법 자리를 곧바로 알게 한다`);
  for (const { lineNumber, text } of header.slice(1)) {
    if (HEADER_USAGE_LINES.some((pattern) => pattern.test(text)))
      problems.push(`${lineNumber}행 머리 주석에 사용법이 남았다. 짝 md로 옮기고 주석에는 「왜」만 둔다: ${text.trim()}`);
  }
  lines.forEach((text, index) => {
    if (USAGE_CONST.test(text))
      problems.push(`${index + 1}행 사용법 상수. 오류 메시지는 사유 한 줄 뒤에 짝 md 경로를 붙인다: ${text.trim()}`);
    else if (!text.trimStart().startsWith('//') && INLINE_USAGE.test(text))
      problems.push(`${index + 1}행 문자열 속 사용법. 짝 md로 옮긴다: ${text.trim()}`);
  });
  return problems;
}

function main(paths) {
  const committing = paths.length === 0;
  const repoRoot = gitToplevel();
  const toRelative = (absolutePath) => slash(path.relative(repoRoot, absolutePath));
  const candidates = committing
    ? stagedScripts(repoRoot)
    : paths.flatMap((inputPath) => {
        const absolutePath = path.resolve(inputPath);
        if (!fs.existsSync(absolutePath)) fail(`없는 경로: ${inputPath}`);
        return walk(absolutePath, []);
      });

  const violations = [];
  let targetCount = 0;
  for (const absolutePath of [...new Set(candidates)].sort()) {
    const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
    if (!lines.some((line) => READS_ARGS.test(line))) continue;
    targetCount++;
    const problems = check(absolutePath, lines, toRelative);
    if (problems.length) violations.push({ file: toRelative(absolutePath), problems });
  }

  // 폴더를 줬는데 인자 받는 스크립트가 하나도 없으면 통과가 아니라 볼 것을 못 찾은 것이다.
  if (!committing && targetCount === 0)
    fail(`인자를 받는 스크립트를 하나도 못 찾았다(${paths.join(' ')}). 경로가 옮겨 갔는지 본다`);

  if (violations.length) {
    console.error('[CLI 사용법 짝 md 의심] 인자(process.argv)를 읽는 스크립트에 사용법 짝 md가 없거나 사용법이 md 밖에 있다:');
    for (const { file, problems } of violations) {
      console.error(`  ${file}`);
      for (const problem of problems) console.error(`    ${problem}`);
    }
    console.error('판단: 사람·AI가 손으로 실행하는 스크립트면 짝 md를 만들어 고친다.');
    console.error('      git·다른 스크립트만 실행해 손으로 부를 일이 없으면 그대로 둔다.');
    console.error(`      짓는 법: ${RULE_DOC}`);
  }
  if (!committing) {
    console.log(`CLI 스크립트 ${targetCount}개 중 의심 ${violations.length}개`);
    process.exit(violations.length ? 1 : 0);
  }
}

const inputPaths = parseArgs(process.argv.slice(2));
try {
  main(inputPaths);
} catch (error) {
  // 커밋 모드는 알리기만 하는 훅이라 검사기 자체가 죽어도 커밋을 막지 않는다.
  if (inputPaths.length) throw error;
  console.error(`[CLI 사용법 짝 md 훅 내부 오류, 건너뜀] ${String(error.message).split('\n')[0]}`);
}
