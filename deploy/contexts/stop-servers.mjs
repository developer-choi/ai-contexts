#!/usr/bin/env node
// 개발·프리뷰 서버를 찾아 끈다 — 지울 폴더를 붙잡은 서버, 또는 세션이 띄운 포트의 서버.
//
// 세션이 띄운 서버는 세션이 닫혀도 안 꺼지고, 그 서버가 파일을 잡고 있으면 폴더 삭제가
// `Access ... is denied`로 막힌다. 끄는 수단이 세션마다 즉흥이던 자리에서 두 가지가 반복해 틀린다.
//   - `Get-Process`는 명령줄을 안 준다. 어느 폴더의 서버인지 가르려면 명령줄이 필요하다
//   - 서버(vite를 돌리는 node)만 끄면 그것을 띄운 npm이 남는다. npm의 명령줄에는 폴더 경로가 없어
//     경로로는 안 잡히고, 부모를 거슬러 올라가야 잡힌다
//
// 무엇을 끌지는 부르는 쪽이 정한다 — 경로로 부르면 그 경로를 명령줄에 담은 것을 누가 띄웠든
// 전부 끄고, 포트로 부르면 그 포트를 들은 것만 끈다. 세션 소유를 가리는 판단은 여기 없다.
//
// 이 스크립트를 부른 명령줄에도 경로가 들어 있으므로, 자기와 자기 조상은 대상에서 뺀다.
//
// 사용:
// (스킬 문서에서는 `{{contexts}}/stop-servers.mjs`로 적는다. 스크립트에서는 import한다.)
//   node <이 파일> list <경로>...        그 경로를 명령줄에 담은 프로세스와 띄운 쪽(npm 등)을 보여준다
//   node <이 파일> stop <경로>...        위 목록을 끄고, 다시 조회해 남은 것이 있으면 exit 1
//   node <이 파일> stop --port <포트>... 그 포트를 듣는 프로세스와 띄운 쪽을 끈다
//   --worktrees                          경로가 git 저장소면 거기서 뻗은 워크트리 경로도 대상에 넣는다
//
// 경로로 못 찾는 서버가 있다 — 명령줄에 상대경로만 적힌 것(node에 `server.js`만 넘긴 것)은 폴더가 cwd여도
// 명령줄에 경로가 없다. 그래서 끈 뒤에도 폴더가 안 지워지면 삭제 성공으로 넘기지 말고 보고한다.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';

// 서버를 띄운 쪽으로 보고 함께 끄는 부모. 여기 없는 부모(bash·powershell·에디터·CLI 에이전트
// 자신)에서는 거슬러 오르기를 멈춘다 — 세션 셸까지 끄면 부른 쪽이 죽는다.
const LAUNCHER = [
  { name: /^cmd(\.exe)?$/i, args: /\s\/[cdsk]\b/i },
  { name: /^node(\.exe)?$/i, args: /npm-cli\.js|npx-cli\.js|pnpm|yarn|[\\/]\.bin[\\/]/i },
  { name: /^(npm|npx|pnpm|yarn)(\.cmd|\.exe)?$/i, args: /./ },
  { name: /^sh$/i, args: /-c\b/ }, // 비Windows npm이 스크립트를 넘기는 셸
];

function processTable() {
  if (isWindows) {
    const out = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return JSON.parse(out).map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, name: p.Name ?? '', cmd: p.CommandLine ?? '' }));
  }
  const out = execFileSync('ps', ['-eo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter(Boolean).map((line) => {
    const [, pid, ppid, comm, args] = /^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/.exec(line) ?? [];
    return { pid: Number(pid), ppid: Number(ppid), name: path.basename(comm ?? ''), cmd: args ?? '' };
  });
}

// 같은 폴더가 명령줄에 여러 꼴로 적힌다 — `C:\a\b`, `C:/a/b`, git bash의 `/c/a/b`.
// 뒤에 구분자·따옴표·공백·끝이 와야 맞은 것으로 친다. `C:\a\b`가 `C:\a\b-copy`에 걸리면 안 된다.
function pathMatcher(target) {
  const abs = path.resolve(target);
  const slash = abs.replaceAll('\\', '/').replace(/\/+$/, '');
  const forms = new Set([slash, slash.replaceAll('/', '\\')]);
  const drive = /^([A-Za-z]):\/(.*)$/.exec(slash);
  if (drive) forms.add(`/${drive[1].toLowerCase()}/${drive[2]}`);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${[...forms].map(escape).join('|')})(?=[\\\\/"'\\s]|$)`, isWindows ? 'i' : '');
}

function ancestorsOf(pid, byPid) {
  const chain = new Set();
  for (let p = byPid.get(pid); p && !chain.has(p.pid); p = byPid.get(p.ppid)) chain.add(p.pid);
  return chain;
}

const isLauncher = (p) => LAUNCHER.some(({ name, args }) => name.test(p.name) && args.test(p.cmd));

// 찾은 프로세스마다 띄운 쪽까지 올라가, 끌 때 트리 꼭대기가 될 pid를 고른다.
function withLaunchers(hits, byPid, protectedPids) {
  const roots = new Map();
  for (const hit of hits) {
    let top = hit;
    for (let parent = byPid.get(top.ppid); parent && !protectedPids.has(parent.pid) && isLauncher(parent); parent = byPid.get(parent.ppid)) {
      top = parent;
    }
    roots.set(top.pid, top);
  }
  return roots;
}

function listeningPids(port) {
  try {
    if (isWindows) {
      const out = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', `Get-NetTCPConnection -State Listen -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      return [...new Set(out.split(/\s+/).filter(Boolean).map(Number))];
    }
    const out = execFileSync('lsof', ['-t', `-iTCP:${Number(port)}`, '-sTCP:LISTEN'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return [...new Set(out.split(/\s+/).filter(Boolean).map(Number))];
  } catch {
    return [];
  }
}

// { paths: [...], ports: [...] }로 대상을 찾는다. 반환: 끌 트리 꼭대기와 그 아래 찾은 프로세스.
export function findServers({ paths = [], ports = [] }) {
  const table = processTable();
  const byPid = new Map(table.map((p) => [p.pid, p]));
  const protectedPids = ancestorsOf(process.pid, byPid);
  protectedPids.add(process.pid);

  const matchers = paths.map(pathMatcher);
  const portPids = new Set(ports.flatMap(listeningPids));
  const hits = table.filter(
    (p) => !protectedPids.has(p.pid) && p.pid !== 0 && (portPids.has(p.pid) || matchers.some((re) => re.test(p.cmd))),
  );
  // 찾은 것끼리 부모·자식이면 자식은 부모 트리를 끌 때 함께 꺼지므로 꼭대기만 남긴다.
  const roots = withLaunchers(hits, byPid, protectedPids);
  for (const pid of [...roots.keys()]) {
    const above = ancestorsOf(pid, byPid);
    above.delete(pid);
    if ([...above].some((a) => roots.has(a))) roots.delete(pid);
  }
  return { hits, roots: [...roots.values()] };
}

function killTree(pid) {
  try {
    if (isWindows) execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      if (!isWindows) process.kill(pid, 'SIGTERM');
    } catch {
      // 이미 없는 프로세스
    }
  }
}

// 끄고 나서 다시 찾는다. 남은 것이 있으면 remaining에 담아 돌려준다 — 성공 여부는 부르는 쪽이 이 값으로 판정한다.
export function stopServers(targets) {
  const { hits, roots } = findServers(targets);
  for (const root of roots) killTree(root.pid);
  const remaining = hits.length ? retryFind(targets) : [];
  return { stopped: roots, hits, remaining };
}

function retryFind(targets) {
  // taskkill은 자식 정리를 기다리지 않고 돌아온다. 곧장 다시 보면 사라지는 중인 것이 남은 것으로 잡힌다.
  for (let i = 0; i < 10; i += 1) {
    const { hits } = findServers(targets);
    if (!hits.length) return [];
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
  }
  return findServers(targets).hits;
}

const short = (cmd) => (cmd.length > 140 ? `${cmd.slice(0, 137)}...` : cmd);
const line = (p) => `    ${p.pid} ${p.name} ${short(p.cmd)}`;

// 저장소 폴더를 지울 때는 거기서 뻗은 워크트리의 서버도 폴더를 잡는다. 워크트리는 저장소 밖 형제 폴더에
// 있을 수 있어 경로 접두사로는 안 잡히므로 git에 묻는다.
export function withWorktrees(paths) {
  const all = new Set(paths.map((p) => path.resolve(p)));
  for (const repo of paths) {
    let out;
    try {
      out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      continue; // git 저장소가 아니거나 이미 메타데이터가 지워진 폴더
    }
    for (const m of out.matchAll(/^worktree (.+)$/gm)) all.add(path.resolve(m[1].trim()));
  }
  return [...all];
}

function parseTargets(args) {
  const paths = [];
  const ports = [];
  let worktrees = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--port') ports.push(args[++i]);
    else if (args[i] === '--worktrees') worktrees = true;
    else paths.push(args[i]);
  }
  if (worktrees) paths.splice(0, paths.length, ...withWorktrees(paths));
  if (ports.some((p) => !/^\d+$/.test(p ?? ''))) {
    console.error('--port 뒤에는 포트 번호를 적는다');
    process.exit(1);
  }
  return { paths, ports };
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  const targets = parseTargets(args);
  if (!['list', 'stop'].includes(command) || targets.paths.length + targets.ports.length === 0) {
    console.error('사용: node <이 파일> <list|stop> <경로>... [--worktrees] [--port <포트>]...');
    process.exit(1);
  }
  const label = [...targets.paths.map((p) => path.resolve(p)), ...targets.ports.map((p) => `포트 ${p}`)].join(', ');

  if (command === 'list') {
    const { hits, roots } = findServers(targets);
    console.log(`[대상] ${label}`);
    if (!hits.length) {
      console.log('  없음 — 이 경로를 명령줄에 담았거나 이 포트를 듣는 프로세스가 없다');
      return;
    }
    console.log(`  찾은 프로세스 ${hits.length}개:`);
    hits.forEach((p) => console.log(line(p)));
    console.log(`  끌 때 트리째 끄는 꼭대기 ${roots.length}개(띄운 npm 등 포함):`);
    roots.forEach((p) => console.log(line(p)));
    return;
  }

  const { stopped, hits, remaining } = stopServers(targets);
  console.log(`[대상] ${label}`);
  if (!hits.length) {
    console.log('  이미 꺼져 있었음 — 끌 프로세스가 없다');
    if (targets.paths.length) console.log('  (명령줄에 상대경로만 적힌 서버는 경로로 안 잡힌다 — 폴더가 안 지워지면 포트로 다시 찾는다)');
    return;
  }
  console.log(`  닫음 — 트리 ${stopped.length}개(찾은 프로세스 ${hits.length}개):`);
  stopped.forEach((p) => console.log(line(p)));
  if (remaining.length) {
    console.log(`  ✗ 끈 뒤에도 남은 프로세스 ${remaining.length}개:`);
    remaining.forEach((p) => console.log(line(p)));
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
