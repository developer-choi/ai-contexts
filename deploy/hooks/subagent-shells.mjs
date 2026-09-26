import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { STALE_IDLE_MS, STATE_DIR } from "./subagent-status.mjs";

// 쉬는 서브에이전트가 남긴 셸을 찾는다. surface-subagent-status.mjs가 프롬프트마다 부른다.
//
// 땜빵(anthropics/claude-code#90672·#91523): Bash·PowerShell 도구의 타임아웃은 명령을 끊지 않고
// 백그라운드로 옮긴다. 턴이 끝난 뒤에도 도는 것은 설계다(끝나면 그 에이전트에 알림이 간다). 버그는
// 에이전트를 /tasks에서 종료해도 셸 트리가 안 죽는 것이다(2026-09-26 실측). 고쳐져도 쉬는 에이전트의
// 셸은 설계대로 남으므로, 고쳐지면 이 파일을 걷을지 다시 본다. 끝난 셸은 출력 파일 끝에 종료 표시가 붙는다 — 밖에서 죽여도 붙는다.

// 셸이 옮겨진 뒤 턴을 끝내고 완료 알림을 기다리는 에이전트도 있다 — 쉰 지 이만큼이 안 됐으면 보지 않는다.
export const SHELL_IDLE_MS = 5 * 60 * 1000;

const BG_NOTICE = "moved to the background";
const BG_RE = /moved to the background \(ID: \w+\)\. Output is being written to: (.+?\.output)/;
const EXITED_RE = /\[exited with code -?\d+\]\s*$/;
// 셸 프로세스는 도구 호출 기록과 결과 기록 사이에 생긴다. 기록 시각과 프로세스 시각의 어긋남만큼 넓힌다.
const SPAWN_SLACK_MS = 5 * 1000;

function parse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function contentOf(entry) {
  const c = entry?.message?.content;
  return Array.isArray(c) ? c : [];
}

function resultText(block) {
  if (typeof block.content === "string") return block.content;
  return Array.isArray(block.content) ? block.content.map((c) => c.text ?? "").join("") : "";
}

function shellRunning(outputFile) {
  try {
    return !EXITED_RE.test(fs.readFileSync(outputFile, "utf8").slice(-200));
  } catch {
    return false;
  }
}

// 백그라운드로 옮겨진 셸 전부. 옮겨진 지 오래일 수 있어 기록 파일 전체를 본다.
function scanNotices(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(BG_NOTICE)) return [];
  const lines = text.split("\n");
  const notices = [];
  for (const line of lines) {
    if (!line.includes(BG_NOTICE)) continue;
    const entry = parse(line);
    for (const block of contentOf(entry)) {
      const m = block.type === "tool_result" && resultText(block).match(BG_RE);
      if (!m) continue;
      const useEntry = parse(lines.find((l) => l.includes(`"id":"${block.tool_use_id}"`)));
      const toolUse = contentOf(useEntry).find((b) => b.type === "tool_use" && b.id === block.tool_use_id);
      if (typeof toolUse?.input?.command !== "string") continue;
      notices.push({
        output: m[1],
        tool: toolUse.name,
        command: toolUse.input.command,
        from: Date.parse(useEntry.timestamp) - SPAWN_SLACK_MS,
        to: Date.parse(entry.timestamp) + SPAWN_SLACK_MS,
      });
    }
  }
  return notices;
}

// Windows만 PID를 찾는다. 다른 OS는 트리째 끝내는 명령을 검증하지 않았다.
function processTable() {
  const r = childProcess.spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      // 명령 원문에 한글이 섞이므로 출력 인코딩을 UTF-8로 고정한다.
      "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process | " +
        "Select-Object ProcessId,ParentProcessId,CommandLine,@{n='Created';e={[DateTimeOffset]::new($_.CreationDate).ToUnixTimeMilliseconds()}} | " +
        "ConvertTo-Json -Compress",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 20 * 1000, maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(r.stdout).map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, cmd: p.CommandLine ?? "", created: p.Created }));
}

// 셸은 명령을 따옴표를 바꿔 감싼 채 명령줄에 싣는다. 따옴표·역슬래시·공백을 걷고 비교한다.
const squash = (s) => s.replace(/['"\\\s]/g, "");

// PowerShell 도구는 명령 원문을 명령줄이 아니라 이 환경변수로 넘긴다 — cmd.exe와 pwsh 명령줄에는 이
// 이름만 실린다(2026-09-26 실측).
const PS_LAUNCHER = "CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT";

// 명령 전체가 명령줄에 들어 있고 그 도구 호출과 결과 사이에 생긴 프로세스만 같은 셸로 본다. 명령만
// 맞추면 `npm test`처럼 흔한 명령을 다른 때 띄운 셸까지 잡는다.
function rootPids(table, shell) {
  const inWindow = (p) => p.created >= shell.from && p.created <= shell.to;
  if (shell.tool === "PowerShell") return launcherRoot(table, inWindow);
  const key = squash(shell.command);
  const matched = table.filter((p) => inWindow(p) && squash(p.cmd).includes(key));
  return matched.filter((p) => !matched.some((q) => q.pid === p.ppid)).map((p) => p.pid);
}

// PowerShell 도구 셸은 명령으로 못 가려, 그 시각에 이 세션의 Claude Code가 띄운 런처로 짝짓는다. 이
// 세션의 Claude Code = 이 훅의 조상 중 런처를 자식으로 둔 가장 가까운 것 — 다른 세션이나, 이 세션을
// 띄운 바깥 세션의 런처는 부모가 달라 빠진다. 조상 자신은 런처여도 뺀다(검증 스크립트를 PowerShell
// 도구로 돌린 경우). 그런 런처가 하나가 아니면 null로 가리지 않는다 — 둘 이상이면 남의 셸을 끝낼 수
// 있고, 없으면 조용히 넘기는 대신 못 가렸다고 알린다.
function launcherRoot(table, inWindow) {
  const byPid = new Map(table.map((p) => [p.pid, p]));
  const ancestors = [];
  for (let pid = process.pid; pid && !ancestors.includes(pid); pid = byPid.get(pid)?.ppid) ancestors.push(pid);
  const launchers = table.filter((p) => p.cmd.includes(PS_LAUNCHER) && !ancestors.includes(p.pid));
  const owner = ancestors.find((pid) => launchers.some((p) => p.ppid === pid));
  const roots = launchers.filter((p) => p.ppid === owner && inWindow(p));
  return roots.length === 1 ? [roots[0].pid] : null;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killCommand(pid) {
  return `taskkill /T /F /PID ${pid}`;
}

function loadCache(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { files: {}, shells: {} };
  }
}

// 이번 프롬프트에 실을 남은 셸. pids가 null이면 PID를 못 찾는 환경이거나 어느 셸인지 못 가린
// 것이다. 같은 셸은 한 번 싣고, STALE_IDLE_MS가 지나도 살아 있으면 다시 싣는다.
//
// 쉬는 에이전트의 기록은 더 안 바뀌므로 판독 결과와 PID를 세션별 파일에 캐시한다 — PowerShell 조회는
// 수 초가 걸려, 매 프롬프트마다 돌리면 그만큼 프롬프트가 늦어진다.
export function leftoverShells(agents, sessionId, now = Date.now()) {
  const cacheFile = path.join(STATE_DIR, `${sessionId}.shells.json`);
  const cache = loadCache(cacheFile);
  const candidates = [];
  for (const a of agents) {
    if (a.state !== "idle" || a.ageMs <= SHELL_IDLE_MS) continue;
    const { mtimeMs, size } = fs.statSync(a.file);
    let entry = cache.files[a.file];
    if (!entry || entry.mtimeMs !== mtimeMs || entry.size !== size) {
      entry = cache.files[a.file] = { mtimeMs, size, notices: scanNotices(a.file) };
    }
    for (const n of entry.notices) if (shellRunning(n.output)) candidates.push({ agent: a.name, ...n });
  }

  const known = (c) => cache.shells[c.output]?.pids?.some(alive);
  const unknown = candidates.filter((c) => !known(c));
  let table = null;
  if (unknown.length && process.platform === "win32") {
    try {
      table = processTable();
    } catch {
      /* 조회 실패 — pids를 null로 둔다 */
    }
  }

  const shells = {};
  const shown = [];
  for (const c of candidates) {
    const prev = cache.shells[c.output] ?? {};
    const pids = known(c) ? prev.pids.filter(alive) : table ? rootPids(table, c) : null;
    const state = (shells[c.output] = { pids, shownAt: prev.shownAt });
    if (pids && !pids.length) continue;
    if (state.shownAt && now - state.shownAt < STALE_IDLE_MS) continue;
    state.shownAt = now;
    shown.push({ agent: c.agent, tool: c.tool, command: c.command, pids });
  }
  cache.shells = shells;
  const files = new Set(agents.map((a) => a.file));
  for (const f of Object.keys(cache.files)) if (!files.has(f)) delete cache.files[f];
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  return shown;
}
