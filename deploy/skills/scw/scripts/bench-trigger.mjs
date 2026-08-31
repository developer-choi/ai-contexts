#!/usr/bin/env node
// 스킬 description의 트리거 정확도 측정 — 쿼리마다 `claude -p`를 돌려 대상 스킬이 발동했는지 본다.
//
// stream-json을 줄 단위로 읽다가 `Skill` tool_use의 `"skill":"<name>"`을 보는 순간 프로세스를 죽인다.
// 그래서 트리거되는 쿼리도 스킬 본문 작업이 끝나기를 기다리지 않고 ~10초에 회수된다.
//
// eval-set JSON: 최상위 배열, 항목마다 `query`(문자열)와 `should_trigger`(불리언).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const USAGE = `사용법: node bench-trigger.mjs --eval-set <json> --skill-path <dir> --out <json> [옵션]

  --eval-set <경로>        쿼리 JSON 배열 (필수)
  --skill-path <경로>      측정 대상 스킬 디렉토리 (필수)
  --out <경로>             결과 JSON 출력 경로 (필수)
  --description <텍스트>   SKILL.md 대신 쓸 description (기본: SKILL.md의 값)
  --num-workers <n>        동시 실행 상한 (기본 5)
  --timeout <초>           쿼리당 타임아웃 (기본 60)
  --runs-per-query <n>     쿼리당 반복 (기본 3)
  --trigger-threshold <f>  통과 판정 임계 비율 (기본 0.5)
  --model <id>             측정 모델 (기본 claude-sonnet-4-6)
  --verbose                진행 로그를 stderr로
`;

function parseArgs(argv) {
  const flags = new Set(['--verbose', '--help', '-h']);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--') && key !== '-h') throw new Error(`알 수 없는 인자: ${key}`);
    if (flags.has(key)) { args[key.replace(/^-+/, '')] = true; continue; }
    const value = argv[++i];
    if (value === undefined) throw new Error(`${key}에 값이 없다`);
    args[key.slice(2)] = value;
  }
  return args;
}

function resolveClaude() {
  const exts = process.platform === 'win32' ? ['.exe', '.com', '', '.cmd', '.bat'] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = path.join(dir, `claude${ext}`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return 'claude';
}

const CLAUDE = resolveClaude();
const NEEDS_SHELL = /\.(cmd|bat)$/i.test(CLAUDE);

// BOM이 붙은 eval-set은 JSON.parse가 못 읽으므로 여기서 떼어낸다.
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function findProjectRoot() {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, '.claude'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

function parseSkillMd(skillPath) {
  const text = fs.readFileSync(path.join(skillPath, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) throw new Error('frontmatter 없음');
  const frontmatter = match[1];
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1].trim() ?? path.basename(skillPath);
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1].trim() ?? '';
  return { name, description };
}

/**
 * 쿼리 한 건. `{triggered, error, stdoutLen}`을 돌려준다.
 *
 * 트리거 신호를 본 순간 프로세스를 죽이므로, 트리거된 쿼리는 본문 작업이 끝나기를 안 기다린다.
 * 타임아웃·spawn 실패는 error에 남아 요약의 실패 열로 올라간다 — 실패를 "트리거 안 됨"과
 * 같은 모양으로 찍으면 측정 안 된 구간이 정상 음성으로 읽힌다.
 */
function runQuery(query, skillName, projectRoot, model, timeoutMs) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;

    let settled = false;
    let child = null;
    let timer = null;
    let buffer = '';
    let stdoutLen = 0;
    let pendingSkill = false;
    let accumulated = '';
    const collected = [];

    const finish = (triggered, error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (child && child.exitCode === null && child.signalCode === null) {
        try { child.kill(); } catch { /* 이미 종료 */ }
      }
      const dumpDir = process.env.BENCH_DUMP_DIR;
      if (dumpDir) {
        try {
          fs.mkdirSync(dumpDir, { recursive: true });
          const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
          fs.writeFileSync(path.join(dumpDir, `${skillName}_${stamp}.jsonl`), collected.join(''), 'utf8');
        } catch { /* 덤프 실패가 측정을 버리게 두지 않는다 */ }
      }
      resolve({ triggered, error, stdoutLen });
    };

    try {
      child = spawn(CLAUDE, [
        '-p', query,
        '--output-format', 'stream-json',
        '--verbose',
        '--include-partial-messages',
        '--model', model,
      ], { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'ignore'], shell: NEEDS_SHELL });
    } catch (error) {
      finish(false, String(error.message));
      return;
    }

    timer = setTimeout(() => finish(false, 'timeout'), timeoutMs);
    child.on('error', (error) => finish(false, String(error.message)));
    child.on('close', () => finish(false, null));

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      collected.push(chunk);
      stdoutLen += chunk.length;
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      consume(lines);
    });
    // 마지막 줄이 개행 없이 끝나면 그 줄에 담긴 트리거 신호를 놓친다.
    child.stdout.on('end', () => {
      if (buffer) { consume([buffer]); buffer = ''; }
    });

    function consume(lines) {
      for (const line of lines) {
        if (!line.trim()) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.type !== 'stream_event') continue;
        const se = event.event ?? {};

        if (se.type === 'content_block_start') {
          if (se.content_block?.type === 'tool_use' && se.content_block?.name === 'Skill') {
            pendingSkill = true;
            accumulated = '';
          }
        } else if (se.type === 'content_block_delta' && pendingSkill) {
          if (se.delta?.type === 'input_json_delta') {
            accumulated += se.delta.partial_json ?? '';
            const hit = accumulated.match(/"skill"\s*:\s*"([^"]+)"/);
            if (hit) {
              if (hit[1] === skillName) { finish(true, null); return; }
              // 다른 스킬 — 이 블록 추적만 끊고 계속 듣는다.
              pendingSkill = false;
              accumulated = '';
            }
          }
        } else if (se.type === 'content_block_stop') {
          pendingSkill = false;
          accumulated = '';
        }
      }
    }
  });
}

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) { process.stdout.write(USAGE); return; }
  if (!args['eval-set'] || !args['skill-path'] || !args.out) {
    process.stderr.write(USAGE);
    process.exitCode = 2;
    return;
  }

  const runsPerQuery = Number(args['runs-per-query'] ?? 3);
  // 기본값이 곧 권장값이다. 예전엔 5·60이었고 산문이 "매번 3·240을 붙여라"로 그 차이를 메웠는데,
  // 빠뜨리면 60초에서 끊긴다 — 트리거되는 쿼리는 본문 작업이 130초를 넘으므로 **정상 트리거가
  // 미트리거로 찍혀 description이 나쁜 것으로 오판된다.** 워커도 윈도우에서 5+면 socket·메모리에 걸린다.
  const workers = Number(args['num-workers'] ?? 3);
  const timeoutMs = Number(args.timeout ?? 240) * 1000;
  const threshold = Number(args['trigger-threshold'] ?? 0.5);
  const model = args.model ?? 'claude-sonnet-4-6';

  const evalSet = readJson(args['eval-set']);
  const { name, description: skillDescription } = parseSkillMd(args['skill-path']);
  const description = args.description ?? skillDescription;
  const projectRoot = findProjectRoot();

  if (args.verbose) {
    process.stderr.write(`Skill: ${name}\nDescription: ${description.slice(0, 200)}...\n`
      + `Queries: ${evalSet.length}, runs: ${runsPerQuery}, workers: ${workers}\n`);
  }

  const jobs = [];
  evalSet.forEach((item, queryIndex) => {
    for (let rep = 0; rep < runsPerQuery; rep++) {
      jobs.push({ queryIndex, rep, query: item.query, shouldTrigger: item.should_trigger });
    }
  });

  let done = 0;
  const runs = await pool(jobs, workers, async (job) => {
    const result = await runQuery(job.query, name, projectRoot, model, timeoutMs);
    done += 1;
    if (args.verbose) {
      const mark = result.triggered ? 'T' : '_';
      process.stderr.write(`  [${done}/${jobs.length}] q${job.queryIndex} r${job.rep} ${mark}`
        + `${result.error ? ` ERR:${result.error}` : ''}\n`);
    }
    return { job, result };
  });

  const byQuery = new Map();
  for (const { job, result } of runs) {
    if (!byQuery.has(job.queryIndex)) {
      byQuery.set(job.queryIndex, { query: job.query, should_trigger: job.shouldTrigger, runs: [] });
    }
    byQuery.get(job.queryIndex).runs.push(result);
  }

  const perQuery = [];
  let passedCount = 0;
  let failedTotal = 0;
  for (const queryIndex of [...byQuery.keys()].sort((a, b) => a - b)) {
    const item = byQuery.get(queryIndex);
    const triggers = item.runs.filter((r) => r.triggered).length;
    const errors = item.runs.filter((r) => r.error).map((r) => r.error);
    const n = item.runs.length;
    const rate = n > 0 ? triggers / n : 0;
    const passed = item.should_trigger ? rate >= threshold : rate < threshold;
    if (passed) passedCount += 1;
    failedTotal += errors.length;
    perQuery.push({
      query: item.query,
      should_trigger: item.should_trigger,
      triggers,
      runs: n,
      rate,
      pass: passed,
      failed: errors.length,
      verdict_withheld: errors.length > 0,
      errors,
    });
  }

  const shouldTrigger = perQuery.filter((r) => r.should_trigger);
  const shouldNot = perQuery.filter((r) => !r.should_trigger);
  const mean = (rows) => (rows.length > 0 ? rows.reduce((sum, r) => sum + r.rate, 0) / rows.length : 0);

  // 집계 합격선. 쿼리 개별 판정(--trigger-threshold)과 다른 축이다 — 이쪽은 description 전체의 판정.
  const TRIGGER_FLOOR = 0.7;
  const FALSE_POSITIVE_CEIL = 0.1;

  const summary = {
    passed: passedCount,
    total: perQuery.length,
    pass_rate: perQuery.length > 0 ? passedCount / perQuery.length : 0,
    failed_total: failedTotal,
    should_trigger_triggered_rate: mean(shouldTrigger),
    should_not_trigger_triggered_rate: mean(shouldNot),
  };

  fs.writeFileSync(args.out, JSON.stringify({ description, summary, results: perQuery }, null, 2), 'utf8');

  // 실패한 런은 트리거 안 된 런과 같은 모양으로 찍히므로 실패 수와 보류 표시를 함께 낸다.
  const lines = [
    '',
    `| 쿼리 | should_trigger | rate | 실패 | 판정 |`,
    `|---|---|---|---|---|`,
    ...perQuery.map((r) => `| ${r.query.slice(0, 60).replaceAll('|', '\\|')} | ${r.should_trigger} | `
      + `${r.triggers}/${r.runs} | ${r.failed} | ${r.verdict_withheld ? '보류(재측정)' : (r.pass ? 'PASS' : 'FAIL')} |`),
    '',
    `통과: ${summary.passed}/${summary.total}   실행 실패: ${failedTotal}건`
      + (failedTotal > 0 ? ' — 실패가 있는 행은 판정하지 않는다' : ''),
    // 두 집계값의 합격선까지 여기서 낸다. 예전엔 숫자만 찍고 0.7·0.1과의 대조를 산문이 시켰는데,
    // 0.65를 통과로 읽어도 아무 데서도 안 걸리고 그 description이 그대로 배포된다.
    `should_trigger 평균 rate: ${summary.should_trigger_triggered_rate.toFixed(2)} `
      + `(${summary.should_trigger_triggered_rate >= TRIGGER_FLOOR ? 'PASS' : `FAIL — ${TRIGGER_FLOOR} 이상 권장`})`,
    `should_not_trigger 평균 rate: ${summary.should_not_trigger_triggered_rate.toFixed(2)} `
      + `(${summary.should_not_trigger_triggered_rate <= FALSE_POSITIVE_CEIL ? 'PASS' : `FAIL — ${FALSE_POSITIVE_CEIL} 이하 권장`})`,
    failedTotal > 0
      ? '실행 실패가 있어 두 평균이 낮게 잡힐 수 있다 — 재측정 전에는 FAIL을 확정으로 읽지 않는다'
      : '',
  ].filter((l) => l !== '');
  process.stdout.write(`${lines.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
