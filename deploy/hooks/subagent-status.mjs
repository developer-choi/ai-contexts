import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 백그라운드 서브에이전트의 상태를 그 에이전트 기록 파일에서 직접 가른다. 주입 훅
// (surface-subagent-status.mjs)과 감시기(subagent-watcher.mjs)가 같은 판정을 쓴다.
//
// `ListAgents`의 running은 "도구 호출에 묶여 결과를 못 받는 중"과 "일하는 중"을 구분하지 않는다.
// 기록 파일의 마지막 줄과 수정 시각은 그 둘을 가른다.

// 결과 없는 tool_use가 이만큼 안 바뀌면 멈춤으로 본다.
export const STUCK_MS = 5 * 60 * 1000;
// 이보다 오래 쉬는 에이전트는 개수만 센다 — 끝난 에이전트도 대기 상태로 남아 실행 중처럼 쌓인다.
export const STALE_IDLE_MS = 30 * 60 * 1000;

// 파일 전체가 아니라 끝부분만 읽는다. 매 프롬프트마다 에이전트 수만큼 돈다.
const TAIL_BYTES = 64 * 1024;
const PREVIEW_CHARS = 200;

export const STATE_DIR = path.join(os.tmpdir(), "claude-subagent-watch");

// 기록은 `{transcript_path의 폴더}/{session_id}/subagents/`에 쌓인다(2026-09-26 실측).
export function subagentsDirOf(transcriptPath, sessionId) {
  if (!transcriptPath || !sessionId) return "";
  return path.join(path.dirname(transcriptPath), sessionId, "subagents");
}

function readTail(file) {
  const fd = fs.openSync(file, "r");
  try {
    const { size } = fs.fstatSync(fd);
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString("utf8").split("\n");
    // 중간에서 잘라 읽었으면 첫 줄은 조각이다.
    if (start > 0) lines.shift();
    return lines.filter((l) => l.trim());
  } finally {
    fs.closeSync(fd);
  }
}

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

// 멈춤 한계. Bash는 timeout을 최대 10분까지 받으므로, 그 값이 있으면 그보다 1분 더 기다린다 —
// 안 그러면 정상적으로 도는 긴 명령을 5분에 멈춤으로 오판한다.
function stuckLimit(toolUse) {
  const t = Number(toolUse?.input?.timeout);
  return Number.isFinite(t) && t > 0 ? Math.max(STUCK_MS, t + 60 * 1000) : STUCK_MS;
}

function summarizeInput(toolUse) {
  const input = toolUse?.input ?? {};
  const raw = input.command ?? input.file_path ?? input.pattern ?? input.prompt ?? JSON.stringify(input);
  return String(raw).replace(/\s+/g, " ").slice(0, 120);
}

function readAgent(dir, jsonlName, now) {
  const base = jsonlName.slice(0, -".jsonl".length);
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, `${base}.meta.json`), "utf8"));
  } catch {
    return null;
  }
  if (meta.requestShape !== "background") return null;

  const file = path.join(dir, jsonlName);
  const ageMs = now - fs.statSync(file).mtimeMs;
  const entries = readTail(file).map(parse).filter(Boolean);

  const sends = [];
  for (const entry of entries) {
    for (const block of contentOf(entry)) {
      if (block.type === "tool_use" && block.name === "SendMessage") {
        const body = typeof block.input?.message === "string" ? block.input.message : JSON.stringify(block.input?.message ?? "");
        sends.push({ id: block.id, to: block.input?.to ?? "", preview: body.replace(/\s+/g, " ").slice(0, PREVIEW_CHARS) });
      }
    }
  }

  const last = entries.at(-1);
  const pending = last?.type === "assistant" ? contentOf(last).filter((b) => b.type === "tool_use").at(-1) : undefined;
  let state;
  if (pending) state = ageMs > stuckLimit(pending) ? "stuck" : "working";
  // 도구 결과가 막 돌아왔으면 모델이 다음 응답을 만드는 중이다.
  else if (last?.type === "user" && contentOf(last).some((b) => b.type === "tool_result")) state = ageMs > STUCK_MS ? "idle" : "working";
  else state = "idle";

  return {
    name: meta.name || meta.agentType || base,
    file,
    state,
    minutes: Math.floor(ageMs / 60000),
    ageMs,
    lastTool: pending ? { id: pending.id, name: pending.name, input: summarizeInput(pending) } : null,
    sends,
  };
}

export function readAgents(dir, now = Date.now()) {
  let names;
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".jsonl"));
  } catch {
    return [];
  }
  const agents = [];
  for (const n of names) {
    try {
      const a = readAgent(dir, n, now);
      if (a) agents.push(a);
    } catch {
      /* 쓰는 중인 파일 등 — 다음 판정에서 다시 본다 */
    }
  }
  return agents;
}

// 주입과 토스트가 같은 문장을 쓴다. 메인은 TaskStop으로 에이전트를 못 끝낸다
// (check-agent-stop-policy.mjs) — 그래서 다음 행동의 주체를 사용자로 적는다.
export function stuckNotice(agent) {
  const tool = agent.lastTool ? `${agent.lastTool.name}: ${agent.lastTool.input}` : "도구 호출";
  return (
    `에이전트 ${agent.name}가 ${agent.minutes}분째 도구 호출에서 멈춤 (${tool}). ` +
    `멈춘 에이전트는 메시지를 못 읽으니 SendMessage로 묻지 말 것. 메인은 TaskStop을 쓸 수 없다 — ` +
    `사용자가 /tasks에서 끝내고, 메인이 같은 지시로 다시 띄운다.`
  );
}
