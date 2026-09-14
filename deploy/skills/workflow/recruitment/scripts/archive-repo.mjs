#!/usr/bin/env node
// 채용과제 보관용 아카이브 레포를 뜬다 — 제출 레포가 지워져도 코드·브랜치·PR이 남게 한다.
//
// 이 파일이 존재하는 이유: 산문 절차일 때 세션이 단계마다 명령을 손으로 짜서 쳤고, 그중
// 두 자리는 틀리면 되돌릴 수 없다.
//   - PR 본문은 제출 레포에만 있다. 레포가 지워진 뒤에는 되살릴 방법이 없다 → collect가 먼저
//     돌지 않으면 create가 거부한다
//   - 원격 교체를 틀리면 로컬 브랜치가 제출 레포로 나간다 → push가 origin을 기계로 한 번 더 본다
//
// 판단은 안 한다 — 아카이브 이름의 slug, PR 제목을 서술형으로 바꿀지, 무엇을 plan 브랜치로
// 옮길지는 부르는 쪽이 정한다.
//
// 사용:
//   node <이 파일> collect <작업폴더>
//   node <이 파일> create <작업폴더> <recruitment-{slug}-{YYYYMMDD}> [--remote-url <url>]
//   node <이 파일> push <복사본>
//   node <이 파일> recreate-prs <복사본> [--title <번호>=<제목>]...
//   node <이 파일> relink <복사본> <파일>...
//
// 순서: collect → create → (사람이 git remote -v 확인) → push → recreate-prs → relink.
// create와 push를 가른 이유: 사이의 확인은 사람 몫인데, 한 명령에 넣으면 대화형 입력이 되고
// 에이전트 실행 환경은 그것을 받을 수 없다.
//
// 걸린 것이 있으면 exit 1.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// git이 추적하지 않는 재생성 가능 폴더. 추적되는 같은 이름 폴더는 제출물이라 복사한다.
const REGENERABLE = new Set(['node_modules', '.next', 'dist', 'build', 'out', '.turbo', '.vite', 'coverage']);
const ARCHIVE_NAME = /^recruitment-[a-z0-9]+(-[a-z0-9]+)*-\d{8}$/;
const COLLECT_DIR = path.join('plan', 'archive');
const FIRST_BASE_BRANCH = 'starter';

const [command, target, ...rest] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    const detail = `${e.stderr || e.message}`.trim().split('\n').pop();
    throw new Error(`${cmd} ${args.join(' ')} 실패: ${detail}`);
  }
}

function tryRun(cmd, args, cwd) {
  try {
    return run(cmd, args, cwd);
  } catch {
    return null;
  }
}

// https://github.com/owner/repo(.git) · git@github.com:owner/repo(.git) → owner/repo
function slugOf(url) {
  const m = /github\.com[:/]([^/]+)\/([^/]+?)(\.git)?\/?$/i.exec(url);
  return m ? `${m[1]}/${m[2]}`.toLowerCase() : null;
}

function originOf(repo) {
  return tryRun('git', ['remote', 'get-url', 'origin'], repo);
}

function loadCollected(repo) {
  const file = path.join(repo, COLLECT_DIR, 'prs.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasCommit(repo, sha) {
  return tryRun('git', ['cat-file', '-e', `${sha}^{commit}`], repo) !== null;
}

function collect(workdir) {
  const origin = originOf(workdir);
  const submitSlug = origin && slugOf(origin);
  if (!submitSlug) fail(`origin이 GitHub 제출 레포가 아니다: ${origin ?? '(없음)'}`);

  const prs = JSON.parse(run('gh', [
    'pr', 'list', '--repo', submitSlug, '--state', 'all', '--limit', '500',
    '--json', 'number,title,state,baseRefName,headRefName,baseRefOid,headRefOid,body,url',
  ])).sort((a, b) => a.number - b.number);
  if (!prs.length) fail(`${submitSlug}에 PR이 없다 — 회수할 본문이 없으면 이 도구가 필요 없다`);

  // 로컬 브랜치가 지워졌거나 force-push로 옮겨졌어도 게시 시점 head는 이 ref로 남는다.
  run('git', ['fetch', 'origin', '+refs/pull/*/head:refs/archive-pr/*'], workdir);
  for (const pr of prs) {
    for (const sha of [pr.baseRefOid, pr.headRefOid]) {
      if (!hasCommit(workdir, sha)) tryRun('git', ['fetch', 'origin', sha], workdir);
      if (!hasCommit(workdir, sha)) fail(`PR #${pr.number}의 커밋 ${sha}를 로컬에 확보하지 못했다`);
    }
  }

  const outDir = path.join(workdir, COLLECT_DIR);
  fs.mkdirSync(outDir, { recursive: true });
  for (const pr of prs) fs.writeFileSync(path.join(outDir, `pr${pr.number}.md`), pr.body);
  const saved = prs.map(({ body, ...meta }) => meta);
  fs.writeFileSync(
    path.join(outDir, 'prs.json'),
    `${JSON.stringify({ submitRemote: origin, submitSlug, collectedAt: new Date().toISOString(), prs: saved }, null, 2)}\n`,
  );

  console.log(`[회수] ${submitSlug} PR ${prs.length}건 → ${path.relative(workdir, outDir)}/`);
  prs.forEach((pr) => console.log(`  #${pr.number} ${pr.state} ${pr.headRefOid.slice(0, 8)} ${pr.title}`));
}

function trackedDirs(workdir) {
  const dirs = new Set();
  for (const file of run('git', ['ls-files'], workdir).split('\n').filter(Boolean)) {
    let dir = path.posix.dirname(file);
    while (dir !== '.' && !dirs.has(dir)) {
      dirs.add(dir);
      dir = path.posix.dirname(dir);
    }
  }
  return dirs;
}

function create(workdir, name) {
  if (!fs.existsSync(path.join(workdir, '.git')) || !fs.statSync(path.join(workdir, '.git')).isDirectory()) {
    fail('작업폴더가 원본 저장소가 아니다(워크트리이거나 git 저장소가 아님) — 브랜치 전부가 든 원본 저장소 폴더를 넘긴다');
  }
  if (!loadCollected(workdir)) {
    fail('회수 산출물(plan/archive/prs.json)이 없다 — collect를 먼저 돌린다. 복사부터 하면 그사이 제출 레포가 지워졌을 때 PR 본문을 되살릴 수 없다');
  }
  if (!name || !ARCHIVE_NAME.test(name)) fail(`아카이브 이름은 recruitment-{slug}-{YYYYMMDD} 꼴이어야 한다: ${name ?? '(없음)'}`);
  const dest = path.join(path.dirname(path.resolve(workdir)), name);
  if (fs.existsSync(dest)) fail(`복사 대상이 이미 있다: ${dest}`);

  const remoteUrlArg = optOf('remote-url');
  let owner = null;
  if (!remoteUrlArg) {
    owner = run('gh', ['api', 'user', '-q', '.login']);
    if (tryRun('gh', ['repo', 'view', `${owner}/${name}`, '--json', 'name']) !== null) {
      fail(`GitHub에 ${owner}/${name}이 이미 있다 — 이름을 바꾸거나 기존 레포를 확인한다`);
    }
  }

  const root = path.resolve(workdir);
  const tracked = trackedDirs(root);
  const skipped = [];
  fs.cpSync(root, dest, {
    recursive: true,
    verbatimSymlinks: true,
    filter: (src) => {
      const rel = path.relative(root, src).split(path.sep).join('/');
      if (!rel || rel === '.git' || rel.startsWith('.git/')) return true;
      if (!REGENERABLE.has(path.basename(src)) || tracked.has(rel)) return true;
      skipped.push(rel);
      return false;
    },
  });

  // .git을 통째로 복사하면 이 메타데이터가 원본 워크트리 경로를 계속 가리켜, 그 브랜치들이
  // 다른 곳에 체크아웃된 것으로 취급된다.
  fs.rmSync(path.join(dest, '.git', 'worktrees'), { recursive: true, force: true });
  run('git', ['worktree', 'prune'], dest);

  run('git', ['remote', 'remove', 'origin'], dest);
  let remoteUrl = remoteUrlArg;
  if (!remoteUrl) {
    run('gh', ['repo', 'create', `${owner}/${name}`, '--private']);
    remoteUrl = `https://github.com/${owner}/${name}.git`;
  }
  run('git', ['remote', 'add', 'origin', remoteUrl], dest);

  console.log(`[복사] ${dest}`);
  console.log(`  제외한 재생성 폴더 ${skipped.length}개${skipped.length ? `: ${skipped.slice(0, 10).join(', ')}` : ''}`);
  console.log(`\n[원격]\n${run('git', ['remote', '-v'], dest)}`);
  console.log('\n→ 여기서 멈춘다. origin이 제출 레포가 아니라 새 아카이브 레포인지 사용자 확인을 받은 뒤 push를 돌린다.');
}

function guardArchiveOrigin(copy) {
  const collected = loadCollected(copy);
  if (!collected) fail('plan/archive/prs.json이 없다 — create로 만든 복사본을 넘긴다');
  const origin = originOf(copy);
  const slug = origin && slugOf(origin);
  if (!origin) fail('origin이 없다');
  // --remote-url로 만든 로컬 원격은 GitHub slug가 없으므로 경로 문자열로 비교한다.
  const same = slug ? slug === collected.submitSlug : path.resolve(origin) === path.resolve(collected.submitRemote);
  if (same) fail(`origin이 아직 제출 레포(${collected.submitSlug})를 가리킨다 — 원격 교체를 다시 확인한다`);
  if (!origin.toLowerCase().includes(path.basename(path.resolve(copy)).toLowerCase())) {
    fail(`origin(${origin})이 이 복사본 이름(${path.basename(copy)})의 레포가 아니다`);
  }
  return { collected, origin, slug };
}

function push(copy) {
  const { origin } = guardArchiveOrigin(copy);
  run('git', ['push', 'origin', '--all'], copy);
  run('git', ['push', 'origin', '--tags'], copy);
  const branches = run('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], copy).split('\n').filter(Boolean);
  console.log(`[push] ${origin}\n  브랜치 ${branches.length}개: ${branches.join(', ')}`);
}

function remoteBranchSha(copy, branch) {
  const line = run('git', ['ls-remote', 'origin', `refs/heads/${branch}`], copy);
  return line ? line.split(/\s+/)[0] : null;
}

// 원격에 같은 이름이 다른 커밋으로 있으면 덮지 않고 번호를 붙인 이름을 쓴다.
function placeBranch(copy, preferred, fallback, sha) {
  for (const name of [preferred, fallback]) {
    const existing = remoteBranchSha(copy, name);
    if (existing === sha) return name;
    if (existing === null) {
      run('git', ['push', 'origin', `${sha}:refs/heads/${name}`], copy);
      return name;
    }
  }
  fail(`브랜치 ${preferred}·${fallback}가 원격에 다른 커밋으로 이미 있다`);
}

function recreatePrs(copy) {
  const { collected, slug } = guardArchiveOrigin(copy);
  if (!slug) fail('recreate-prs는 GitHub 아카이브 레포에서만 돈다');
  const titles = new Map();
  rest.forEach((arg, i) => {
    if (arg !== '--title') return;
    const m = /^(\d+)=(.+)$/s.exec(rest[i + 1] ?? '');
    if (!m) fail(`--title은 <번호>=<제목> 꼴이다: ${rest[i + 1]}`);
    titles.set(Number(m[1]), m[2]);
  });

  // 새 레포는 이슈·PR 번호가 1부터 붙는다. 먼저 생긴 것이 있으면 번호가 어긋난다.
  const existing = JSON.parse(run('gh', ['api', `repos/${slug}/issues?state=all&per_page=1`]));
  if (existing.length) fail(`${slug}에 이슈·PR이 이미 있어 번호를 재현할 수 없다`);
  const prs = collected.prs;
  const gaps = prs.filter((pr, i) => pr.number !== i + 1);
  if (gaps.length && !rest.includes('--allow-number-gaps')) {
    fail(`제출 레포 PR 번호가 1부터 이어지지 않는다(이슈가 번호를 썼다) — 번호가 달라져도 되면 --allow-number-gaps`);
  }

  const created = [];
  prs.forEach((pr, i) => {
    const prev = prs[i - 1];
    // 앞 PR head 위에 쌓인 PR이면 스택을 복원하고, 아니면(기본 브랜치에서 뻗었거나 squash 뒤
    // rebase됐으면) 게시 당시 base 커밋을 그대로 쓴다.
    const stacked = prev && tryRun('git', ['merge-base', '--is-ancestor', prev.headRefOid, pr.headRefOid], copy) !== null;
    const baseSha = stacked ? prev.headRefOid : pr.baseRefOid;
    const base = stacked
      ? created[i - 1].head
      : placeBranch(copy, i === 0 ? FIRST_BASE_BRANCH : `pr${pr.number}-base`, `pr${pr.number}-base-${baseSha.slice(0, 7)}`, baseSha);
    const head = placeBranch(copy, pr.headRefName, `pr${pr.number}/${pr.headRefName}`, pr.headRefOid);
    const title = titles.get(pr.number) ?? pr.title;
    const bodyFile = path.join(copy, COLLECT_DIR, `pr${pr.number}.md`);

    const url = run('gh', ['pr', 'create', '--repo', slug, '--base', base, '--head', head, '--title', title, '--body-file', bodyFile]);
    const number = Number(/\/pull\/(\d+)/.exec(url)?.[1]);
    run('gh', ['pr', 'close', String(number), '--repo', slug]);
    created.push({ number, original: pr.number, base, head, baseSha, url });
    if (number !== pr.number) fail(`번호가 어긋났다: 원본 #${pr.number} → 아카이브 #${number}. 여기서 멈춘다`);
  });

  let mismatches = 0;
  console.log(`[PR 재생성] ${slug}`);
  for (const [i, c] of created.entries()) {
    const pr = prs[i];
    const got = JSON.parse(run('gh', ['pr', 'view', String(c.number), '--repo', slug, '--json', 'state,body,baseRefOid,headRefOid']));
    const body = fs.readFileSync(path.join(copy, COLLECT_DIR, `pr${pr.number}.md`), 'utf8');
    const checks = {
      head: got.headRefOid === pr.headRefOid,
      base: got.baseRefOid === c.baseSha,
      body: got.body.trimEnd() === body.trimEnd(),
      closed: got.state === 'CLOSED',
    };
    const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    mismatches += bad.length;
    console.log(`  #${c.number} ${c.base} <- ${c.head} ${bad.length ? `불일치: ${bad.join(', ')}` : '일치'}`);
  }
  if (mismatches) fail('게시본과 회수 파일이 어긋난 PR이 있다');
}

function relink(copy, files) {
  const { collected, slug } = guardArchiveOrigin(copy);
  if (!slug) fail('relink는 GitHub 아카이브 레포에서만 돈다');
  if (!files.length) fail('치환할 파일을 넘긴다');
  // PR 번호·커밋 SHA·브랜치 이름이 아카이브에서 같으므로 레포 경로만 바꾸면 링크가 산다.
  const from = new RegExp(`https://github\\.com/${collected.submitSlug.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?=[/)#?\\s"'>]|$)`, 'gim');
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const count = text.match(from)?.length ?? 0;
    if (count) fs.writeFileSync(file, text.replace(from, `https://github.com/${slug}`));
    console.log(`[치환] ${file} ${count}건`);
  }
  const checker = path.join(path.dirname(fileURLToPath(import.meta.url)), 'check-submission.mjs');
  let leftovers = 0;
  for (const file of files) {
    try {
      execFileSync(process.execPath, [checker, 'pr-body', file, '--submit-remote', `github.com/${collected.submitSlug}`], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const out = `${e.stdout ?? ''}`;
      if (/제출 레포를 가리키는 링크\] [1-9]/.test(out)) {
        leftovers += 1;
        console.log(out);
      }
    }
  }
  if (leftovers) fail('제출 레포 링크가 남은 파일이 있다');
}

function optOf(name) {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
}

if (!command || !target) fail('사용: node <이 파일> <collect|create|push|recreate-prs|relink> <대상> [인자]');
if (!fs.existsSync(target)) fail(`대상이 없다: ${target}`);

try {
  if (command === 'collect') collect(target);
  else if (command === 'create') create(target, rest[0]);
  else if (command === 'push') push(target);
  else if (command === 'recreate-prs') recreatePrs(target);
  else if (command === 'relink') relink(target, rest);
  else fail(`모르는 명령: ${command}`);
} catch (e) {
  fail(e.message);
}
