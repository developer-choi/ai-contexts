#!/usr/bin/env node
// 사용법: prior-sessions.md (같은 폴더)
//
// 이 PR 워크트리에서 돈 앞 세션의 Claude Code 기록(jsonl)을 찾는다.
//
// 기록 폴더는 세션을 「연」 경로의 슬러그다. 워크트리 안에서 연 세션은 워크트리 슬러그 폴더에,
// 메인 레포에서 열고 EnterWorktree로 들어간 세션은 메인 레포 슬러그 폴더에 쌓인다. 한 폴더만 보면
// 어느 쪽이든 놓치므로, 메인 레포 슬러그로 시작하는 폴더를 모두 보고 jsonl 안의 `cwd`로 가른다.
// 폴더 전체(수 GB)를 다 읽지 않으려고 폴더 이름으로만 후보를 좁힌다.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const optOf = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const norm = (p) => path.resolve(p).replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
const slug = (p) => path.resolve(p).replace(/[^A-Za-z0-9]/g, '-');

function git(cwd, gitArgs) {
  return execFileSync('git', ['-C', cwd, ...gitArgs], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let worktree;
let mainRoot;
try {
  worktree = git(optOf('worktree') ?? process.cwd(), ['rev-parse', '--show-toplevel']);
  mainRoot = path.dirname(git(worktree, ['rev-parse', '--path-format=absolute', '--git-common-dir']));
} catch (e) {
  console.error(`git 레포가 아니다: ${optOf('worktree') ?? process.cwd()} (${String(e.stderr ?? e.message).trim()})`);
  process.exit(1);
}
const exclude = optOf('session') ?? process.env.CLAUDE_CODE_SESSION_ID;

const root = path.join(os.homedir(), '.claude', 'projects');
if (!fs.existsSync(root)) {
  console.error(`${root}가 없다. 이 기기에서 Claude Code 기록을 찾을 수 없다.`);
  process.exit(1);
}

const target = norm(worktree);
const prefix = slug(mainRoot);
const CWD = /"cwd":"((?:[^"\\]|\\.)*)"/g;

function ranHere(file) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(CWD)) {
    const cwd = norm(JSON.parse(`"${m[1]}"`));
    if (cwd === target || cwd.startsWith(`${target}/`)) return true;
  }
  return false;
}

const found = [];
for (const dir of fs.readdirSync(root)) {
  if (!dir.startsWith(prefix)) continue;
  const full = path.join(root, dir);
  for (const name of fs.readdirSync(full)) {
    if (!name.endsWith('.jsonl')) continue;
    if (exclude && name === `${exclude}.jsonl`) continue;
    const file = path.join(full, name);
    if (ranHere(file)) found.push({ file, mtime: fs.statSync(file).mtimeMs });
  }
}

found.sort((earlier, later) => earlier.mtime - later.mtime);
for (const { file } of found) console.log(file);
console.error(`앞 세션 ${found.length}건 (워크트리 ${worktree}${exclude ? `, 뺀 세션 ${exclude}` : ''})`);
