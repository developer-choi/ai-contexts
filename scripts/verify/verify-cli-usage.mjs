#!/usr/bin/env node
// 사용법: verify-cli-usage.md (같은 폴더)
//
// 인자를 받는 스크립트마다 같은 폴더·같은 이름의 사용법 md가 있고, 사용법이 그 md에만 있는지 본다.
// 짓는 법은 [CLI 스크립트의 사용법은 짝 md에](../../deploy/contexts/rules-as-code-authoring.md#cli-스크립트의-사용법은-짝-md에).
//
// 사용법이 머리 주석에만 있으면 인자만 알고 싶은 AI가 소스를 통째로 연다(steps.mjs 50KB가 그랬다).
// 주석·USAGE 상수·md에 나눠 두면 한쪽만 고쳐져 어긋난다. 짝 md를 빠뜨린 스크립트는 사람이 눈으로
// 못 잡으므로 커밋에서 막는다.
//
// 정적 검사다 — 스크립트를 실행하지 않는다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const RULE_DOC = '[CLI 스크립트의 사용법은 짝 md에](deploy/contexts/rules-as-code-authoring.md#cli-스크립트의-사용법은-짝-md에)';
const USAGE_DOC = path.join(import.meta.dirname, 'verify-cli-usage.md').replace(/\\/g, '/');

// argv[0]·[1]만 읽는 파일은 진입점 판별일 뿐 인자를 받지 않는다. 그 밖의 읽기(`[2]`·`.slice(`·
// `.includes(`·별칭 대입·구조분해)는 모두 인자를 받는 것으로 본다.
const READS_ARGS = /process\.argv(?!\s*\[\s*[01]\s*\])/;

// 인자를 읽지만 사람·AI가 손으로 실행하지 않는 파일. 실행하는 쪽이 정해져 있어 사용법 md를 볼 사람이 없다.
// 늘리려면 사유를 함께 적는다 — 사유 없는 면제는 검사를 조용히 죽인다.
const EXEMPT = {
  'deploy/hooks/recruitment-commit-guard.mjs': 'git commit-msg 훅이 메시지 파일 경로를 넘긴다',
  'deploy/hooks/surface-subagent-status.mjs': '`--watch`는 자기 자신을 spawn할 때만 붙인다',
  'scripts/verify/verify-incremental-deploy.mjs': 'process.argv를 테스트용으로 덮어쓸 뿐 읽지 않는다',
};

const SKIP_DIRS = new Set(['node_modules', '.git', '.claude']);

const slash = (filePath) => filePath.replace(/\\/g, '/');
const rel = (abs) => slash(path.relative(repoRoot, abs));

function fail(msg) {
  console.error(`${msg}\n사용법: ${USAGE_DOC}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { list: false, staged: false, paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') opts.list = true;
    else if (arg === '--staged') opts.staged = true;
    else if (arg.startsWith('-')) fail(`모르는 옵션: ${arg}`);
    else opts.paths.push(arg);
  }
  if (opts.staged && opts.paths.length) fail('--staged와 폴더·파일 인자는 함께 주지 않는다');
  if (!opts.staged && !opts.paths.length) fail('검사할 폴더·파일이나 --staged가 필요하다');
  return opts;
}

function walk(abs, out) {
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (abs.endsWith('.mjs')) out.push(abs);
    return out;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    walk(path.join(abs, entry.name), out);
  }
  return out;
}

// 커밋에 오른 .mjs와, 지워지거나 바뀐 짝 md의 .mjs. 짝 md만 지운 커밋도 잡아야 한다.
function stagedScripts() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRD'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32,
  });
  const files = new Set();
  for (const f of out.split('\0').filter(Boolean)) {
    if (f.endsWith('.mjs')) files.add(f);
    else if (f.endsWith('.md')) files.add(f.replace(/\.md$/, '.mjs'));
  }
  return [...files].map((file) => path.join(repoRoot, file)).filter((abs) => fs.existsSync(abs));
}

// shebang 다음부터 이어지는 `//` 줄.
function headerLines(lines) {
  let i = lines[0]?.startsWith('#!') ? 1 : 0;
  const header = [];
  for (; i < lines.length && lines[i].startsWith('//'); i++) header.push({ no: i + 1, text: lines[i] });
  return header;
}

// 머리 주석에 남은 사용법: 호출 꼴(`node …x.mjs`, 줄머리 `node <이 파일> …`)이나 옵션을 줄머리에 둔 줄.
const HEADER_USAGE_LINES = [/\bnode\s+\S*\.mjs\b/, /^\/\/\s+node\s/, /^\/\/\s+--?[A-Za-z][\w-]*(\s|$)/];
// 사용법을 문자열로 든 상수(`USAGE`·`…_USAGE`). 짝 md 경로를 든 `USAGE_DOC`은 값이 경로라 안 걸린다.
const USAGE_CONST = /\bconst\s+\w*USAGE\s*=\s*(`|'|"|\[|\{)/;
// 문자열 안의 사용법 블록(`사용:\n…`·`사용법:\n…`).
const INLINE_USAGE = /사용(?:법)?:\s*(?:\\n|`\s*$)/;

function check(abs) {
  const base = path.basename(abs, '.mjs');
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const problems = [];
  const pair = abs.replace(/\.mjs$/, '.md');
  if (!fs.existsSync(pair)) problems.push(`짝 md 없음 — ${rel(pair)}를 만들고 사용법을 그리로 옮긴다`);

  const header = headerLines(lines);
  const expected = `// 사용법: ${base}.md (같은 폴더)`;
  if (header[0]?.text.trim() !== expected)
    problems.push(`머리 주석 첫 줄이 \`${expected}\`가 아니다 — 소스를 연 AI가 사용법 자리를 곧바로 알게 한다`);
  for (const { no, text } of header.slice(1)) {
    if (HEADER_USAGE_LINES.some((pattern) => pattern.test(text)))
      problems.push(`${no}행 머리 주석에 사용법이 남았다 — 짝 md로 옮기고 주석에는 「왜」만 둔다: ${text.trim()}`);
  }
  lines.forEach((text, i) => {
    if (USAGE_CONST.test(text))
      problems.push(`${i + 1}행 사용법 상수 — 오류 메시지는 사유 한 줄 뒤에 짝 md 경로를 붙인다: ${text.trim()}`);
    else if (!text.trimStart().startsWith('//') && INLINE_USAGE.test(text))
      problems.push(`${i + 1}행 문자열 속 사용법 — 짝 md로 옮긴다: ${text.trim()}`);
  });
  return problems;
}

const opts = parseArgs(process.argv.slice(2));
const candidates = opts.staged
  ? stagedScripts()
  : opts.paths.flatMap((inputPath) => {
      const abs = path.resolve(repoRoot, inputPath);
      if (!fs.existsSync(abs)) fail(`없는 경로: ${inputPath}`);
      return walk(abs, []);
    });

const targets = [];
let exempt = 0;
for (const abs of [...new Set(candidates)].sort()) {
  if (!READS_ARGS.test(fs.readFileSync(abs, 'utf8'))) continue;
  const r = rel(abs);
  if (EXEMPT[r]) {
    exempt++;
    continue;
  }
  targets.push(abs);
}

if (opts.list) {
  for (const abs of targets) console.log(rel(abs));
  process.exit(0);
}

// 폴더를 줬는데 인자 받는 스크립트가 하나도 없으면 통과가 아니라 볼 것을 못 찾은 것이다.
if (!opts.staged && targets.length + exempt === 0)
  fail(`인자를 받는 스크립트를 하나도 못 찾았다(${opts.paths.join(' ')}) — 경로가 옮겨 갔는지 본다`);

let violations = 0;
for (const abs of targets) {
  const problems = check(abs);
  if (!problems.length) continue;
  violations++;
  console.error(rel(abs));
  for (const p of problems) console.error(`  ${p}`);
}

const summary = `CLI 스크립트 ${targets.length}개 중 위반 ${violations}개${exempt ? ` (면제 ${exempt}개)` : ''}`;
if (violations) {
  console.error(`\n${summary}`);
  console.error(`짓는 법: ${RULE_DOC}`);
  process.exit(1);
}
if (targets.length || !opts.staged) console.log(summary);
