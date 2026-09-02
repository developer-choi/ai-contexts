#!/usr/bin/env node
// 규칙 ablation 벤치 — `claude -p`를 격리 환경에서 돌려 규칙 유무가 응답을 바꾸는지 잰다.
//
// 왜 API가 아니라 CLI를 모는가:
// 측정 대상 규칙은 `~/.claude/rules/*.md`에 살고, 보통의 `claude -p`와 모든 서브에이전트가
// 그걸 자동 로드한다 — 그래서 기본 상태로는 규칙 없는 ZERO 팔이 성립하지 않는다
// (specialized/rule-ablation-bench.md 「상속 경로」).
//
// 격리 방식 (사용 전 실측으로 확인됨):
// - `--setting-sources ""`가 배포된 설정·메모리 원천(사용자·프로젝트 규칙, CLAUDE.md)을 통째로 뗀다.
// - `--append-system-prompt`로 통제된 시스템 프롬프트를 도로 넣는다. 팔마다 이 텍스트만 다르다.
// - 콜마다 빈 임시 cwd에서 돌려 프로젝트 CLAUDE.md가 범위에 안 들어오게 한다.
//
// CLI의 기존 OAuth 로그인을 쓴다 — `ANTHROPIC_API_KEY` 불필요.
//
// eval-set JSON 스키마:
// {
//   "rule_id": "...",
//   "base_system": "...{TARGET}...",           // {TARGET}이 팔 텍스트로 치환된다
//   "variants": {"ZERO": "", "V1": "..."},
//   "variant_cwds": {"ZERO": "/path/to/wt-zero", "V1": "/path/to/wt-v1"},  // (선택) 팔별 작업 폴더
//   "worker_permission_mode": "acceptEdits",    // (선택) 생성 콜의 --permission-mode. 없으면 안 붙인다

//   "grader": {                                 // 전 시나리오 기본 채점 분류지
//     "instruction": "(선택) 채점자에게 줄 추가 지시",
//     "classes": [{"id": "ONE_AT_A_TIME", "desc": "..."}, {"id": "DUMP_ALL", "desc": "..."}]
//   },
//   "scenarios": [
//     {"id": "P1", "type": "positive", "user": "...", "pass_when": ["ONE_AT_A_TIME"]},
//     {"id": "M1", "type": "positive", "user": "...",  // 다축 — 한 응답을 독립 항목 여럿으로 잰다
//      "grader": {"axes": [
//        {"id": "field_a", "question": "...", "classes": [{"id": "YES", "desc": "..."},
//                                                          {"id": "NO", "desc": "..."}],
//         "pass_when": ["YES"]}
//      ]}}
//   ],
//   "inheritance_signatures": ["...", "..."]    // ZERO 응답이 이 문구를 재사용하면 환경 상속 의심
// }
//
// 분류지는 스크립트 상수가 아니라 eval-set이 소유한다 — 측정 대상마다 분류가 다르기 때문이다.
// 시나리오에 `grader`가 있으면 그것이, 없으면 최상위 `grader`가 쓰인다.
//
// `worker_permission_mode`도 같은 이유로 eval-set이 소유한다 — 파일을 고치는 작업을 재는 벤치와
// 판단만 재는 벤치가 필요로 하는 권한이 다르다. 기본은 안 붙이는 것이라 기존 eval-set의 동작은
// 그대로다. 유효값은 CLI가 정본이고 틀린 값은 CLI가 거부해 그 콜이 실행 실패로 잡힌다.
//
// 왜 필요한가: `--setting-sources ''`는 배포된 규칙과 함께 권한 설정도 떼어내, 워커가 파일을
// 못 고친다. 그런데 그 거부("파일 수정 권한이 필요합니다")는 rc=0에 정상 응답이라 실행 실패로
// 안 세어지고 채점자가 그 한 줄을 성실히 분류한다 — 안 잰 구간이 Δ=0으로 찍힌다
// (2026-09-02 rules-as-code 트리거 벤치 실측: 스모크 9런 전멸, 우회하려 시나리오를 "문안만
// 내라"로 바꿨더니 이번엔 그 지시가 압박이 되어 본 발사 90콜이 통째로 판정 보류).
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const USAGE = `사용법: node bench-ablation.mjs --eval-set <json> --out <json> [옵션]

  --eval-set <경로>      측정 명세 JSON (필수)
  --out <경로>           결과 JSON 출력 경로 (필수)
  --reps <n>             시나리오×팔당 반복 수 (기본 7)
  --model <id>           측정 대상 생성 모델 (기본 claude-sonnet-4-6)
  --grader-model <id>    채점 모델 (기본 claude-sonnet-4-6)
  --workers <n>          동시 실행 상한 (기본 8)
  --timeout <초>         콜당 타임아웃 (기본 180)
  --variants <a,b>       팔 필터
  --scenarios <a,b>      시나리오 필터
  --dump-dir <경로>      런별 원본 JSON 덤프 위치
  --verbose              진행 로그를 stderr로
  --allow-over-cap       한 번의 발사 상한(100콜)을 의도적으로 넘길 때
`;

function parseArgs(argv) {
  const flags = new Set(['--verbose', '--allow-over-cap', '--help', '-h']);
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

// Windows에선 `claude`가 확장자 없이 PATH에 안 잡힌다. .exe를 먼저 찾고,
// .cmd 셔임만 있으면 shell을 거쳐 부른다(그 경로는 개행 포함 인자가 깨질 수 있어 한 번 경고한다).
function resolveClaude() {
  const exts = process.platform === 'win32'
    ? ['.exe', '.com', '', '.cmd', '.bat']
    : [''];
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
let shellWarned = false;

// 워커가 권한이 없어 작업을 못 했다고 말하는 응답. 이 거부는 rc=0에 정상 응답이라 실행 실패로
// 안 잡히고, 채점자가 그 한 줄을 성실히 분류해 안 잰 구간이 점수로 찍힌다. 근사 매칭이라 판정이
// 아니라 경고로만 쓴다 — 놓치면 회차가 통째로 날아가고, 헛짚어도 사람이 응답을 보면 그만이다.
const PERMISSION_REFUSAL = /권한(이|을)?\s*(필요|없|거부|허용)|permission (to|is|denied|required)|need.{0,12}permission/i;

function execFileAsync(file, args, options) {
  return new Promise((resolve) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        resolve({
          stdout: error.stdout ?? stdout ?? '',
          stderr: error.stderr ?? stderr ?? '',
          code: typeof error.code === 'number' ? error.code : 1,
          killed: Boolean(error.killed) || error.signal != null,
        });
        return;
      }
      resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code: 0, killed: false });
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 격리된 `claude -p` 콜 한 번. stdout 텍스트를 돌려주거나, 반복 실패 시 던진다.
 *
 * `fixedCwd`가 오면 그 폴더에서 돈다(만들지도 지우지도 않는다). 측정 대상이 시스템 프롬프트가 아니라
 * **워커가 열어야 할 파일**일 때 쓴다 — `claude -p`는 cwd 밖 절대경로를 읽기 거부하므로(실측),
 * 팔마다 변형을 적용한 체크아웃을 cwd로 줘야 "그 파일을 여는가"를 잴 수 있다.
 *
 * 임시 cwd는 응답을 손에 쥔 **뒤** finally에서 지운다. 윈도우에선 `claude`가 자기 cwd 안
 * 파일 핸들을 쥔 채 끝나 정리가 WinError 32로 터지는데, 예전 파이썬판은 그 예외가
 * `with` 블록 밖으로 새어 이미 받은 응답을 통째로 버렸다(2026-08-15 round7: 266런 전멸).
 * `force`+재시도로 대부분 넘기고, 그래도 남는 예외는 삼킨다 — 정리는 실패해도 되지만
 * 토큰을 쓰고 받은 응답은 버리면 안 된다.
 */
async function claudeP(prompt, system, model, timeoutMs, tries = 3, fixedCwd = null, permissionMode = null) {
  // `/`로 시작하는 프롬프트는 CLI가 슬래시 명령으로 가로채 `Unknown command:` 한 줄만 돌려주는데,
  // 그게 rc=0에 비어있지 않은 stdout이라 실패로 안 세고 채점자가 그 한 줄을 성실히 분류한다.
  // 측정 안 된 구간이 델타로 둔갑하므로 콜을 쓰기 전에 끊는다 (2026-08-22 round15 실측: 스모크 12런 전멸).
  if (prompt.trimStart().startsWith('/')) {
    throw new Error(`프롬프트가 '/'로 시작한다 — CLI가 슬래시 명령으로 가로챈다. 스킬 호출은 "\`/x\`를 부른다"처럼 문장 안에 넣어라: ${prompt.slice(0, 60)}`);
  }
  let last = '';
  for (let i = 0; i < tries; i++) {
    const cwd = fixedCwd ?? fs.mkdtempSync(path.join(os.tmpdir(), 'abl_'));
    let result;
    try {
      if (NEEDS_SHELL && !shellWarned) {
        shellWarned = true;
        process.stderr.write(`경고: ${CLAUDE} 셔임을 shell 경유로 부른다 — 개행 포함 인자가 깨질 수 있다\n`);
      }
      result = await execFileAsync(
        CLAUDE,
        [
          '-p', prompt, '--model', model, '--setting-sources', '', '--append-system-prompt', system,
          ...(permissionMode ? ['--permission-mode', permissionMode] : []),
        ],
        { cwd, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: NEEDS_SHELL },
      );
    } finally {
      try {
        if (!fixedCwd) fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // 정리 실패는 결과에 영향을 주지 않는다.
      }
    }

    const out = (result.stdout || '').trim();
    if (out.startsWith('Unknown command:')) {
      throw new Error(`CLI가 프롬프트를 슬래시 명령으로 가로챘다: ${out.slice(0, 120)}`);
    }
    if (result.code === 0 && out) return out;
    last = result.killed ? 'timeout' : `rc=${result.code} err=${(result.stderr || '').slice(0, 160)}`;
    await sleep(2000 * (i + 1));
  }
  throw new Error(`claude -p 실패: ${last}`);
}

/** 시나리오가 쓸 채점 축 목록. 단축이면 길이 1, 다축이면 축마다 하나. */
function axesOf(scenario, spec) {
  const grader = scenario.grader ?? spec.grader;
  if (!grader) {
    throw new Error(`채점 분류지가 없다 (시나리오 ${scenario.id}) — eval-set에 grader.classes 또는 grader.axes를 둔다`);
  }
  const axes = Array.isArray(grader.axes)
    ? grader.axes.map((axis) => ({ ...axis }))
    : [{ id: null, question: null, classes: grader.classes, pass_when: scenario.pass_when }];

  for (const axis of axes) {
    const label = axis.id ? `${scenario.id}#${axis.id}` : scenario.id;
    if (!Array.isArray(axis.classes) || axis.classes.length === 0) {
      throw new Error(`분류지가 비었다 (${label})`);
    }
    const ids = axis.classes.map((c) => c.id);
    if (!Array.isArray(axis.pass_when) || axis.pass_when.length === 0) {
      throw new Error(`통과조건(pass_when)이 없다 (${label})`);
    }
    const unknown = axis.pass_when.filter((id) => !ids.includes(id));
    if (unknown.length > 0) {
      throw new Error(`통과조건이 분류지에 없는 값을 가리킨다 (${label}): ${unknown.join(', ')}`);
    }
  }
  return { axes, instruction: grader.instruction ?? null };
}

function graderSystem(axes, instruction) {
  const head = '너는 어시스턴트 응답을 아래 분류지로 채점하는 채점자다. 내용 정확성이 아니라 분류지가 정의한 축만 본다.';
  const extra = instruction ? `${instruction}\n` : '';
  const listing = (classes) => classes.map((c) => `- ${c.id}: ${c.desc}`).join('\n');

  if (axes.length === 1 && axes[0].id === null) {
    const shape = axes[0].classes.map((c) => c.id).join('|');
    return `${head}\n${extra}다음 중 정확히 하나로 분류한다:\n${listing(axes[0].classes)}\n`
      + `반드시 아래 JSON만 출력한다(다른 텍스트 금지):\n`
      + `{"class": "${shape}", "reason": "한 문장"}`;
  }

  const blocks = axes.map((axis) => `[${axis.id}] ${axis.question ?? ''}\n${listing(axis.classes)}`).join('\n\n');
  const shape = axes
    .map((axis) => `"${axis.id}": {"class": "${axis.classes.map((c) => c.id).join('|')}", "reason": "한 문장"}`)
    .join(', ');
  return `${head}\n${extra}아래 항목을 각각 독립적으로 판정한다 — 한 항목의 판정이 다른 항목에 영향을 주지 않는다.\n\n${blocks}\n\n`
    + `반드시 아래 JSON만 출력한다(다른 텍스트 금지):\n{${shape}}`;
}

/**
 * 첫 `{`부터 괄호 균형이 맞는 지점까지 잘라낸다. 문자열 리터럴 안의 중괄호와 이스케이프는 세지 않는다.
 * 균형이 안 맞은 채 끝나면 `truncated`로, 그때까지의 열린 문자열·중괄호 상태를 함께 돌려준다.
 */
function scanBraces(raw) {
  const start = raw.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return { text: raw.slice(start, i + 1), truncated: false };
  }
  return { text: raw.slice(start), truncated: true, depth, inString };
}

/**
 * 채점자 응답에서 JSON을 건진다. 후보를 셋으로 좁혀 차례로 시도한다 —
 * ① 괄호 균형이 맞는 첫 덩이 ② 첫 `{`~마지막 `}` greedy ③ 열린 문자열·중괄호만 닫아 붙인 복구본.
 *
 * ③이 필요한 이유: 채점자 출력이 닫는 `}` 없이 끊기는 일이 실제로 난다. 분류(`{"class": "BOTH", ...`)는
 * 이미 다 나온 뒤인데 greedy 한 번만 쓰면 행 전체가 PARSE_ERROR로 버려진다
 * (2026-08-22 round15 실측: 30런 중 2건, 그 때문에 묶음 하나를 세 번 다시 돌렸다).
 * 없는 값을 지어내지 않고 이미 나온 필드만 건진다.
 */
function extractJson(raw) {
  const scanned = scanBraces(raw);
  const candidates = [];
  if (scanned && !scanned.truncated) candidates.push(scanned.text);
  const greedy = raw.match(/\{[\s\S]*\}/);
  if (greedy) candidates.push(greedy[0]);
  if (scanned?.truncated) {
    const closed = scanned.text.replace(/,\s*$/, '');
    candidates.push(closed + (scanned.inString ? '"' : '') + '}'.repeat(scanned.depth));
  }

  for (const text of candidates) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // 다음 후보로.
    }
  }
  return null;
}

async function gradeRun(userText, response, axes, instruction, model, timeoutMs) {
  const prompt = `[사용자 요청]\n${userText}\n\n[어시스턴트 응답]\n${response}\n\n위 응답을 분류지대로 채점해라.`;
  const raw = await claudeP(prompt, graderSystem(axes, instruction), model, timeoutMs);
  const obj = extractJson(raw);
  const parseError = (axis) => ({
    axis: axis.id, class: 'PARSE_ERROR', passed: false, failed: true, reason: raw.slice(0, 200),
  });
  if (!obj) return axes.map(parseError);

  return axes.map((axis) => {
    const node = axis.id === null ? obj : obj[axis.id];
    const cls = node && typeof node === 'object' ? node.class : undefined;
    if (!axis.classes.some((c) => c.id === cls)) return parseError(axis);
    return {
      axis: axis.id,
      class: cls,
      passed: axis.pass_when.includes(cls),
      failed: false,
      reason: typeof node.reason === 'string' ? node.reason : '',
    };
  });
}

async function runOne(job, spec, args) {
  const { scenario, target } = job;
  const { axes, instruction } = axesOf(scenario, spec);
  const timeoutMs = Number(args.timeout ?? 180) * 1000;
  const system = spec.base_system.replaceAll('{TARGET}', target);

  let response;
  try {
    // 채점 콜은 파일을 안 보므로 팔별 cwd도 편집 권한도 주지 않는다 — 생성 콜만 그 안에서 돈다.
    response = await claudeP(
      scenario.user, system, args.model, timeoutMs, 3,
      spec.variant_cwds?.[job.variant] ?? null, spec.worker_permission_mode ?? null,
    );
  } catch (error) {
    return {
      response: '',
      axes: axes.map((axis) => ({
        axis: axis.id, class: 'ERROR', passed: false, failed: true, reason: String(error.message).slice(0, 200),
      })),
    };
  }

  try {
    return { response, axes: await gradeRun(scenario.user, response, axes, instruction, args['grader-model'], timeoutMs) };
  } catch (error) {
    return {
      response,
      axes: axes.map((axis) => ({
        axis: axis.id, class: 'GRADER_ERROR', passed: false, failed: true, reason: String(error.message).slice(0, 200),
      })),
    };
  }
}

/** 동시 실행 상한을 건 Promise 풀. 완료 순서와 무관하게 입력 순서로 결과를 돌려준다. */
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

// BOM이 붙은 eval-set은 JSON.parse가 못 읽으므로 여기서 떼어낸다.
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) { process.stdout.write(USAGE); return; }
  if (!args['eval-set'] || !args.out) { process.stderr.write(USAGE); process.exitCode = 2; return; }

  args.reps = Number(args.reps ?? 7);
  args.model ??= 'claude-sonnet-4-6';
  args['grader-model'] ??= 'claude-sonnet-4-6';
  const workers = Number(args.workers ?? 8);

  const spec = readJson(args['eval-set']);
  const signatures = spec.inheritance_signatures ?? [];
  let variants = spec.variants;
  let scenarios = spec.scenarios;

  if (args.variants) {
    const keep = new Set(args.variants.split(','));
    variants = Object.fromEntries(Object.entries(variants).filter(([name]) => keep.has(name)));
  }
  if (args.scenarios) {
    const keep = new Set(args.scenarios.split(','));
    scenarios = scenarios.filter((s) => keep.has(s.id));
  }

  const variantNames = Object.keys(variants);
  const jobs = [];
  for (const scenario of scenarios) {
    for (const [variant, target] of Object.entries(variants)) {
      for (let rep = 0; rep < args.reps; rep++) jobs.push({ scenario, variant, target, rep });
    }
  }

  // 한 번의 발사 상한. 런마다 생성 1콜 + 채점 1콜이라 콜 수는 여기서 확정된다.
  // 분류지·폴더 점검보다 먼저 본다 — 쪼개야 하는 회차라면 그 사실을 먼저 알아야 스펙을 손보는
  // 순서가 헛돌지 않는다. 셋 다 콜을 쓰기 전이다.
  //
  // 왜 스크립트가 막나: 2026-08-15 round7에서 324콜을 한 번에 쏘아 창이 소진됐고 뒤쪽
  // 시나리오 10개가 죽었다. 죽은 런은 채점이 비어 요약 표에 0점으로 찍혔고, **양 팔이 나란히
  // 0이라 "델타 없음 → 삭제 유지"로 읽히는 표**가 나왔다 — 측정 안 된 구간이 삭제 근거로
  // 둔갑했다. 곱셈을 사람이 하면 그 곱을 안 해보고 쏘는 회차가 나오고, 넘겼다는 사실은 표가
  // 0으로 채워진 뒤에야, 그것도 델타로 위장해 드러난다.
  const CALL_CAP = 100;
  const calls = jobs.length * 2;
  if (calls > CALL_CAP && !args['allow-over-cap']) {
    throw new Error(
      `${calls}콜 (런 ${jobs.length} x 2) — 한 번의 발사 상한 ${CALL_CAP}콜을 넘는다.\n`
      + `  시나리오 ${scenarios.length} x 팔 ${variantNames.length} x 반복 ${args.reps} x 2 = ${calls}\n`
      + `  묶음을 가르지 말고 케이스 필터(--scenarios·--variants)로 배치를 끊고 결과는 한 md에 모은다.\n`
      + `  콜 수는 대리 지표다 — 프롬프트가 길거나 같은 창에서 다른 작업을 돌렸으면 더 낮게 잡는다.\n`
      + `  의도한 초과면 --allow-over-cap.`,
    );
  }

  // 분류지 오류는 콜을 쓰기 전에 끊는다.
  for (const scenario of scenarios) axesOf(scenario, spec);

  // 없는 팔별 폴더도 마찬가지 — cwd가 없으면 그 팔 전 런이 실패해 "델타 없음"으로 읽힌다.
  for (const [variant, cwd] of Object.entries(spec.variant_cwds ?? {})) {
    if (!variantNames.includes(variant)) continue;
    if (!fs.existsSync(cwd)) throw new Error(`팔 작업 폴더가 없다 (${variant}): ${cwd}`);
  }

  if (args.verbose) {
    process.stderr.write(`rule=${spec.rule_id} variants=${variantNames.join(',')} `
      + `scenarios=${scenarios.map((s) => s.id).join(',')} reps=${args.reps} `
      + `-> ${jobs.length}런 x2콜 = ${calls}/${CALL_CAP}콜 (gen=${args.model}, workers=${workers})\n`);
  }
  if (args['dump-dir']) fs.mkdirSync(args['dump-dir'], { recursive: true });

  let done = 0;
  const runs = await pool(jobs, workers, async (job) => {
    const result = await runOne(job, spec, args);
    done += 1;
    if (args['dump-dir']) {
      fs.writeFileSync(
        path.join(args['dump-dir'], `${job.scenario.id}_${job.variant}_r${job.rep}.json`),
        JSON.stringify({ scenario: job.scenario.id, variant: job.variant, rep: job.rep, ...result }, null, 2),
        'utf8',
      );
    }
    if (args.verbose) {
      const marks = result.axes
        .map((a) => `${a.axis ? `${a.axis}=` : ''}${a.class}${a.passed ? '(PASS)' : ''}`)
        .join(' ');
      process.stderr.write(`  [${done}/${jobs.length}] ${job.scenario.id}/${job.variant} r${job.rep} ${marks}\n`);
    }
    return { job, result };
  });

  // 행 = 시나리오(단축) 또는 시나리오#축(다축). 다축은 축마다 독립 판정이므로 행을 나눈다.
  const table = {};
  for (const scenario of scenarios) {
    const { axes } = axesOf(scenario, spec);
    for (const axis of axes) {
      const rowId = axis.id ? `${scenario.id}#${axis.id}` : scenario.id;
      table[rowId] = {
        scenario: scenario.id,
        axis: axis.id,
        type: scenario.type,
        pass_when: axis.pass_when,
        variants: Object.fromEntries(variantNames.map((v) => [v, { pass: 0, n: 0, failed: 0, classes: {} }])),
        failed_total: 0,
        verdict_withheld: false,
      };
    }
  }

  const inheritance = [];
  const permissionBlocked = [];
  for (const { job, result } of runs) {
    if (PERMISSION_REFUSAL.test(result.response ?? '')) {
      permissionBlocked.push({ scenario: job.scenario.id, variant: job.variant, excerpt: result.response.slice(0, 120) });
    }
    for (const axisResult of result.axes) {
      const rowId = axisResult.axis ? `${job.scenario.id}#${axisResult.axis}` : job.scenario.id;
      const cell = table[rowId].variants[job.variant];
      cell.n += 1;
      if (axisResult.passed) cell.pass += 1;
      if (axisResult.failed) { cell.failed += 1; table[rowId].failed_total += 1; }
      cell.classes[axisResult.class] = (cell.classes[axisResult.class] ?? 0) + 1;
    }
    if (job.variant === 'ZERO' && result.response) {
      const hit = signatures.filter((sig) => result.response.includes(sig));
      if (hit.length > 0) {
        inheritance.push({ scenario: job.scenario.id, signatures: hit, excerpt: result.response.slice(0, 160) });
      }
    }
  }

  let failedTotal = 0;
  for (const row of Object.values(table)) {
    row.verdict_withheld = row.failed_total > 0;
    failedTotal += row.failed_total;
  }

  fs.writeFileSync(args.out, JSON.stringify({
    rule_id: spec.rule_id,
    model: args.model,
    grader_model: args['grader-model'],
    reps: args.reps,
    failed_total: failedTotal,
    table,
    inheritance_flags: inheritance,
    permission_blocked: permissionBlocked,
  }, null, 2), 'utf8');

  const rowIds = Object.keys(table);
  const lines = [
    '',
    `# ablation: ${spec.rule_id}  (model=${args.model}, reps=${args.reps})`,
    '',
    `| 시나리오 | type | ${variantNames.join(' | ')} | 실패 | 판정 |`,
    `|${'---|'.repeat(variantNames.length + 4)}`,
  ];
  for (const rowId of rowIds) {
    const row = table[rowId];
    const cells = variantNames.map((v) => `${row.variants[v].pass}/${row.variants[v].n}`);
    // 실패한 런은 채점 결과가 비어 실제 0점과 같은 모양으로 찍힌다. 열이 없으면
    // 측정 안 된 구간이 "델타 없음"으로 읽히므로 실패 수와 보류 표시를 함께 낸다.
    lines.push(`| ${rowId} | ${row.type} | ${cells.join(' | ')} | ${row.failed_total} | `
      + `${row.verdict_withheld ? '보류(재측정)' : '-'} |`);
  }
  lines.push('');
  lines.push(`실행 실패: ${failedTotal}건` + (failedTotal > 0 ? ' — 실패가 있는 행은 판정하지 않는다' : ''));
  lines.push(`환경상속 의심: ${inheritance.length}건`
    + inheritance.map((f) => `\n  - ${f.scenario}: ${f.signatures.join(', ')}`).join(''));
  if (permissionBlocked.length > 0) {
    const where = [...new Set(permissionBlocked.map((f) => `${f.scenario}/${f.variant}`))].join(', ');
    lines.push(`권한 거부 응답: ${permissionBlocked.length}건 — 워커가 작업을 못 했다. `
      + `eval-set에 worker_permission_mode를 주고 다시 잰다 (${where})`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
