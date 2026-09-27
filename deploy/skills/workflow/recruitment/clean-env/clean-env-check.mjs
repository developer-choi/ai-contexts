#!/usr/bin/env node
// 채용과제 제출물을 빈 GitHub Actions 러너에서 설치→빌드→실행→홈페이지 응답까지 돌리고, 흔적을 모두 지운다.
//
//   node clean-env-check.mjs --github <owner/repo> [옵션]
//   node clean-env-check.mjs --zip <제출 zip 경로> [옵션]
//
// 옵션: --env-file <파일>   repo secret ENV_LOCAL로 넣고 러너에서 --env-name 파일로 써 준다
//       --env-name <이름>   러너에 쓸 env 파일명 (기본 .env.local)
//       --node <버전>       기본 24
//       --port <포트>       기본 3000
//
// 종료 코드: 0 = run 성공, 1 = run 실패, 2 = 절차 오류(인자·gh 권한·push 등), 3 = 정리 실패(흔적 남음),
// 130 = 중단 후 정리 완료. 어느 쪽이든 끝나면 임시 브랜치·run·secret·임시 레포를 지운다(Ctrl+C로 끊어도).

import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, copyFileSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRANCH = 'ci-check';
const WORKFLOW_PATH = '.github/workflows/clean-install.yml';

class ProcedureError extends Error {}

function parseArgs(argv) {
  const opts = { envName: '.env.local', node: '24', port: '3000' };
  const keys = { '--github': 'github', '--zip': 'zip', '--env-file': 'envFile', '--env-name': 'envName', '--node': 'node', '--port': 'port' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = keys[argv[i]];
    if (!key || argv[i + 1] === undefined) throw new ProcedureError(`알 수 없는 인자: ${argv[i]}`);
    opts[key] = argv[i + 1];
  }
  if (!opts.github === !opts.zip) throw new ProcedureError('--github <owner/repo> 또는 --zip <경로> 중 하나만 준다');
  return opts;
}

function run(cmd, args, { cwd, quiet } = {}) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'inherit'] }).trim();
}

const log = (msg) => console.error(`[clean-env] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function renderWorkflow(template, opts) {
  let text = readFileSync(join(HERE, template), 'utf8');
  for (const [pattern, value] of [['PORT: 3000', `PORT: ${opts.port}`], ['node-version: 24', `node-version: ${opts.node}`], ['> .env.local', `> ${opts.envName}`]]) {
    // 템플릿이 바뀌어 자리를 못 찾으면 넘긴 값이 조용히 무시되므로 멈춘다
    if (!text.includes(pattern)) throw new ProcedureError(`${template}에서 '${pattern}'을 찾지 못했다`);
    text = text.replace(pattern, value);
  }
  return text;
}

function checkDeleteScope() {
  const status = execFileSync('gh', ['auth', 'status'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (!status.includes("'delete_repo'")) {
    throw new ProcedureError('gh 토큰에 delete_repo scope가 없다 — 사용자에게 `gh auth refresh -s delete_repo`를 요청한다');
  }
}

// push 직후엔 run이 아직 등록 전일 수 있어, headSha가 push한 커밋과 같아질 때까지 다시 조회한다
async function findRun(repo, sha) {
  for (let i = 0; i < 60; i++) {
    const out = run('gh', ['run', 'list', '-R', repo, '-b', BRANCH, '-L', '5', '--json', 'databaseId,headSha']);
    const hit = JSON.parse(out).find((r) => r.headSha === sha);
    if (hit) return hit.databaseId;
    await sleep(3000);
  }
  throw new ProcedureError('push한 커밋의 run이 3분 안에 등록되지 않았다');
}

function watch(repo, id) {
  return new Promise((resolve) => {
    const child = spawn('gh', ['run', 'watch', String(id), '-R', repo, '--exit-status', '-i', '10'], { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('close', (code) => resolve(code === 0));
  });
}

function printFailedLog(repo, id) {
  try {
    process.stdout.write(run('gh', ['run', 'view', String(id), '-R', repo, '--log-failed'], { quiet: true }).slice(-6000) + '\n');
  } catch { /* 로그를 못 받아도 판정은 이미 났다 */ }
}

function commitAndPush(dir, remote, message) {
  run('git', ['checkout', '-q', '-B', BRANCH], { cwd: dir });
  run('git', ['add', '-A'], { cwd: dir });
  run('git', ['commit', '-q', '-m', message], { cwd: dir });
  run('git', ['push', '-q', remote, `${BRANCH}:${BRANCH}`], { cwd: dir, quiet: true });
  return run('git', ['rev-parse', 'HEAD'], { cwd: dir });
}

const cleanups = [];
let cleaning = null;

function attempt(label, fn) {
  try { fn(); } catch (e) { log(`정리 실패 — ${label}: ${e.message.split('\n')[0]}`); return false; }
  return true;
}

function cleanup() {
  if (cleaning) return cleaning;
  let ok = true;
  for (const step of cleanups.reverse()) ok = attempt(step.label, step.fn) && ok;
  cleaning = ok;
  return ok;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.zip) checkDeleteScope(); // 레포를 지우는 건 zip 모드뿐이다

  const work = mkdtempSync(join(tmpdir(), 'clean-env-'));
  cleanups.push({ label: '스크래치 폴더', fn: () => rmSync(work, { recursive: true, force: true }) });

  let repo;
  if (opts.github) {
    repo = opts.github;
    run('git', ['clone', '-q', '--depth', '1', `https://github.com/${repo}.git`, work], { quiet: true });
    mkdirSync(join(work, '.github/workflows'), { recursive: true });
    writeFileSync(join(work, WORKFLOW_PATH), renderWorkflow('github.yml', opts));
  } else {
    const user = run('gh', ['api', 'user', '-q', '.login']);
    repo = `${user}/clean-env-${Date.now()}`;
    run('gh', ['repo', 'create', repo, '--private'], { quiet: true });
    cleanups.push({ label: `임시 레포 ${repo}`, fn: () => run('gh', ['repo', 'delete', repo, '--yes'], { quiet: true }) });
    run('git', ['init', '-q'], { cwd: work });
    copyFileSync(opts.zip, join(work, 'submission.zip'));
    mkdirSync(join(work, '.github/workflows'), { recursive: true });
    writeFileSync(join(work, WORKFLOW_PATH), renderWorkflow('zip.yml', opts));
  }
  log(`대상 ${repo}`);

  if (opts.envFile) {
    // 값을 인자로 넘기면 프로세스 목록에 드러나므로 stdin으로 넘긴다
    execFileSync('gh', ['secret', 'set', 'ENV_LOCAL', '-R', repo], { input: readFileSync(opts.envFile), stdio: ['pipe', 'ignore', 'ignore'] });
    cleanups.push({ label: 'secret ENV_LOCAL', fn: () => run('gh', ['secret', 'delete', 'ENV_LOCAL', '-R', repo], { quiet: true }) });
  }

  // run은 브랜치를 지워도 남으므로 브랜치 삭제와 별도로 지운다. 정리는 역순이라 run 삭제가 브랜치 삭제보다 먼저 돈다
  if (opts.github) {
    cleanups.push({ label: `브랜치 ${BRANCH}`, fn: () => run('git', ['push', '-q', 'origin', '--delete', BRANCH], { cwd: work, quiet: true }) });
  }
  cleanups.push({
    label: `${BRANCH} run`,
    fn: () => {
      const ids = run('gh', ['run', 'list', '-R', repo, '-b', BRANCH, '-L', '100', '--json', 'databaseId', '-q', '.[].databaseId']);
      for (const id of ids.split('\n').filter(Boolean)) {
        try { run('gh', ['run', 'cancel', id, '-R', repo], { quiet: true }); } catch { /* 이미 끝난 run */ }
        for (let i = 0; ; i++) {
          try { run('gh', ['run', 'delete', id, '-R', repo], { quiet: true }); break; } catch (e) {
            if (i >= 20) throw e; // 취소 직후 진행 중인 run은 지워지지 않아 잠시 기다린다
            execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},3000)']);
          }
        }
      }
    },
  });

  const remote = opts.github ? 'origin' : `https://github.com/${repo}.git`;
  const sha = commitAndPush(work, remote, 'ci: clean-install check');
  const id = await findRun(repo, sha);
  log(`run ${id} 대기`);
  const passed = await watch(repo, id);
  if (!passed) printFailedLog(repo, id);
  log(passed ? 'run 성공' : 'run 실패');
  return passed ? 0 : 1;
}

let interrupted = false;
for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
  process.on(sig, () => {
    if (interrupted) return;
    interrupted = true;
    log('중단 — 정리한다');
    const ok = cleanup();
    process.exit(ok ? 130 : 3);
  });
}

let code;
try {
  code = await main();
} catch (e) {
  log(e instanceof ProcedureError ? e.message : `절차 오류: ${e.message}`);
  code = 2;
}
if (!interrupted) {
  if (!cleanup()) { log('흔적이 남았다 — 위 정리 실패 항목을 손으로 지운다'); code = 3; }
  process.exit(code);
}
